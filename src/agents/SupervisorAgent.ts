import { ResearchAgent } from './ResearchAgent';
import { PlanAgent } from './PlanAgent';
import { WriterAgent } from './WriterAgent';
import { EditorAgent } from './EditorAgent';
import { ReviewAgent } from './ReviewAgent';
import { logger } from '../logger';
import { loadSkills, getSkillsForAgent, formatSkillsForPrompt } from '../skills';
import type {
  Article,
  SupervisorConfig,
  WorkflowStage,
  WorkflowState,
  ReviewResult,
  Skill,
  AgentName,
} from '../types/index';

export class SupervisorAgent {
  private config: Required<SupervisorConfig>;
  private reviewAgent: ReviewAgent;
  private skills: Skill[] = [];

  constructor(config: SupervisorConfig, reviewAgent?: ReviewAgent) {
    this.config = {
      language: 'ja',
      maxLength: 3000,
      output: '',
      maxRetries: 2,
      ...config,
    };
    this.reviewAgent = reviewAgent ?? new ReviewAgent(this.config.language, '');
  }

  private getSkillsText(agentName: AgentName): string {
    const agentSkills = getSkillsForAgent(this.skills, agentName);
    return formatSkillsForPrompt(agentSkills);
  }

  async run(): Promise<Article> {
    const { topic, language, maxRetries } = this.config;

    // Load skills
    this.skills = await loadSkills('skills');
    if (this.skills.length > 0) {
      logger.info(`[SupervisorAgent] ${this.skills.length}個のスキルを読み込みました`);
      for (const skill of this.skills) {
        logger.debug(`  - ${skill.name}: ${skill.description} (${skill.agents.join(', ')})`);
      }
    }

    // Update review agent with skills
    this.reviewAgent = new ReviewAgent(this.config.language, this.getSkillsText('review'));

    logger.always(`\n=== mikan-press: 記事生成開始 (SupervisorAgent) ===`);
    logger.always(`トピック: ${topic}`);
    logger.always(`最大リトライ: ${maxRetries}\n`);

    const state: WorkflowState = {
      stage: 'research',
      retries: { research: 0, plan: 0, write: 0, edit: 0 },
      reviewHistory: [],
    };

    const researchAgent = new ResearchAgent(language, this.getSkillsText('research'));
    const planAgent = new PlanAgent(language, this.getSkillsText('plan'));
    const writerAgent = new WriterAgent(language, this.getSkillsText('writer'));
    const editorAgent = new EditorAgent(language, this.getSkillsText('editor'));

    // 1. Research
    if (process.env.SKIP_RESEARCH === 'true') {
      logger.info('[SupervisorAgent] SKIP_RESEARCH=true: リサーチをスキップします');
      state.research = { topic, summary: topic, keyPoints: [], sources: [] };
    } else {
      state.research = await this.executeWithReview(
        'research',
        state,
        (feedback) => researchAgent.run(topic, feedback),
        (result) => JSON.stringify(result, null, 2),
        maxRetries
      );
    }

    // 2. Plan
    state.plan = await this.executeWithReview(
      'plan',
      state,
      (feedback) => planAgent.run(state.research!, feedback),
      (result) => JSON.stringify(result, null, 2),
      maxRetries
    );

    // 3. Write
    state.sections = await this.executeWithReview(
      'write',
      state,
      (feedback) => writerAgent.run(state.plan!, state.research!, feedback),
      (sections) => sections.map((s) => `## ${s.title}\n${s.content}`).join('\n\n'),
      maxRetries
    );

    // Build intermediate article for editor
    const draft: Article = {
      title: state.plan!.title,
      content: '',
      sections: state.sections!,
      metadata: {
        topic,
        language,
        generatedAt: new Date().toISOString(),
        wordCount: 0,
      },
    };

    // 4. Edit
    state.finalContent = await this.executeWithReview(
      'edit',
      state,
      (feedback) => editorAgent.run(draft, feedback),
      (content) => content,
      maxRetries
    );

    const article: Article = {
      ...draft,
      content: state.finalContent!,
      metadata: {
        ...draft.metadata,
        wordCount: state.finalContent!.length,
      },
    };

    logger.always(`\n=== 生成完了 (${state.finalContent!.length}字) ===`);
    logger.always(`レビュー履歴: ${state.reviewHistory.length}件`);
    const revises = state.reviewHistory.filter((h) => h.result.decision === 'revise').length;
    if (revises > 0) {
      logger.always(`差し戻し回数: ${revises}回`);
    }
    logger.always('');

    return article;
  }

  private async executeWithReview<T>(
    stage: WorkflowStage,
    state: WorkflowState,
    execute: (feedback?: string) => Promise<T>,
    serialize: (result: T) => string,
    maxRetries: number
  ): Promise<T> {
    let feedback: string | undefined;
    let result: T;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      result = await execute(feedback);
      const serialized = serialize(result);

      const review: ReviewResult = await this.reviewAgent.review(stage, serialized);
      state.reviewHistory.push({ stage, result: review, attempt });
      state.retries[stage] = attempt;

      if (review.decision === 'approve') {
        return result;
      }

      // revise
      if (attempt < maxRetries) {
        logger.info(`[SupervisorAgent] ${stage} を差し戻します (${attempt + 1}/${maxRetries})`);
        feedback = review.feedback;
      } else {
        logger.warn(`[SupervisorAgent] ${stage} の最大リトライ回数に到達。現在の結果で続行します。`);
      }
    }

    return result!;
  }
}
