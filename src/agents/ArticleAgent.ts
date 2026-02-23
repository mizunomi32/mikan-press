import { ResearchAgent } from './ResearchAgent';
import { PlanAgent } from './PlanAgent';
import { WriterAgent } from './WriterAgent';
import { EditorAgent } from './EditorAgent';
import { logger } from '../logger';
import type { Article, ArticleConfig } from '../types/index';

export class ArticleAgent {
  private config: Required<ArticleConfig>;

  constructor(config: ArticleConfig) {
    this.config = {
      language: 'ja',
      maxLength: 3000,
      output: '',
      ...config,
    };
  }

  async run(): Promise<Article> {
    const { topic, language } = this.config;
    logger.always(`\n=== mikan-press: 記事生成開始 ===`);
    logger.always(`トピック: ${topic}\n`);

    // 1. Research (Gemini 2.5 Flash Lite)
    let research;
    if (process.env.SKIP_RESEARCH === 'true') {
      logger.info('[ArticleAgent] SKIP_RESEARCH=true: リサーチをスキップします');
      research = { topic, summary: topic, keyPoints: [], sources: [] };
    } else {
      const researchAgent = new ResearchAgent(language);
      research = await researchAgent.run(topic);
    }

    // 2. Plan (GLM)
    const planAgent = new PlanAgent(language);
    const plan = await planAgent.run(research);

    // 3. Write (GLM)
    const writerAgent = new WriterAgent(language);
    const sections = await writerAgent.run(plan, research);

    // Build intermediate article for editor
    const draft: Article = {
      title: plan.title,
      content: '',
      sections,
      metadata: {
        topic,
        language,
        generatedAt: new Date().toISOString(),
        wordCount: 0,
      },
    };

    // 4. Edit (GLM)
    const editorAgent = new EditorAgent(language);
    const finalContent = await editorAgent.run(draft);

    const article: Article = {
      ...draft,
      content: finalContent,
      metadata: {
        ...draft.metadata,
        wordCount: finalContent.length,
      },
    };

    logger.always(`\n=== 生成完了 (${finalContent.length}字) ===\n`);
    return article;
  }
}
