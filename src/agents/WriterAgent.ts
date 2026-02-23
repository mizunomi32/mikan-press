import { chat, resolveModel } from '../clients/chat';
import {
  buildIntroPrompt,
  buildSectionPrompt,
  buildConclusionPrompt,
} from '../prompts/writer';
import { logger } from '../logger';
import type { ArticlePlan, ArticleSection, ResearchResult } from '../types/index';

function defaultSpec(): string {
  const zhipuModel = process.env.ZHIPU_MODEL ?? 'glm-4-flash';
  return `zhipu/${zhipuModel}`;
}

export class WriterAgent {
  private modelSpec: string;

  constructor(private language: string = 'ja') {
    this.modelSpec = resolveModel('WRITER_MODEL', defaultSpec());
  }

  async run(
    plan: ArticlePlan,
    research: ResearchResult,
    feedback?: string
  ): Promise<ArticleSection[]> {
    logger.info('[WriterAgent] 執筆を開始します...');
    const feedbackSuffix = feedback
      ? `\n\n## 前回のレビューフィードバック\n以下の点を改善してください:\n${feedback}`
      : '';
    const sections: ArticleSection[] = [];

    // Introduction
    const introContent = await chat(this.modelSpec, [
      { role: 'user', content: buildIntroPrompt(plan, research, this.language) + feedbackSuffix },
    ]);
    sections.push({ title: '__intro', content: introContent.trim() });
    logger.info('[WriterAgent] 導入部 完了');

    // Body sections (sequential to maintain coherence)
    for (const section of plan.sections) {
      const content = await chat(this.modelSpec, [
        {
          role: 'user',
          content: buildSectionPrompt(
            section.title,
            section.description,
            research,
            this.language
          ),
        },
      ]);
      sections.push({ title: section.title, content: content.trim() });
      logger.debug(`[WriterAgent] セクション "${section.title}" 完了`);
    }

    // Conclusion
    const conclusionContent = await chat(this.modelSpec, [
      { role: 'user', content: buildConclusionPrompt(plan, this.language) },
    ]);
    sections.push({ title: '__conclusion', content: conclusionContent.trim() });
    logger.info('[WriterAgent] まとめ 完了');

    return sections;
  }
}
