import { glmChat } from '../clients/glm';
import {
  buildIntroPrompt,
  buildSectionPrompt,
  buildConclusionPrompt,
} from '../prompts/writer';
import type { ArticlePlan, ArticleSection, ResearchResult } from '../types/index';

export class WriterAgent {
  constructor(private language: string = 'ja') {}

  async run(
    plan: ArticlePlan,
    research: ResearchResult
  ): Promise<ArticleSection[]> {
    console.log('[WriterAgent] 執筆を開始します...');
    const sections: ArticleSection[] = [];

    // Introduction
    const introContent = await glmChat([
      { role: 'user', content: buildIntroPrompt(plan, research, this.language) },
    ]);
    sections.push({ title: '__intro', content: introContent.trim() });
    console.log('[WriterAgent] 導入部 完了');

    // Body sections (sequential to maintain coherence)
    for (const section of plan.sections) {
      const content = await glmChat([
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
      console.log(`[WriterAgent] セクション "${section.title}" 完了`);
    }

    // Conclusion
    const conclusionContent = await glmChat([
      { role: 'user', content: buildConclusionPrompt(plan, this.language) },
    ]);
    sections.push({ title: '__conclusion', content: conclusionContent.trim() });
    console.log('[WriterAgent] まとめ 完了');

    return sections;
  }
}
