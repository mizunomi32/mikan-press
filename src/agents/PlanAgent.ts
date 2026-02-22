import { glmChat } from '../clients/glm';
import { buildPlanPrompt } from '../prompts/plan';
import type { ArticlePlan, ResearchResult } from '../types/index';

export class PlanAgent {
  constructor(private language: string = 'ja') {}

  async run(research: ResearchResult): Promise<ArticlePlan> {
    console.log('[PlanAgent] 記事構成を生成します...');
    const prompt = buildPlanPrompt(research, this.language);
    const raw = await glmChat([{ role: 'user', content: prompt }]);

    const parsed = this.parseJson(raw, research.topic);
    console.log(`[PlanAgent] 完了: "${parsed.title}"`);
    return parsed;
  }

  private parseJson(raw: string, topic: string): ArticlePlan {
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    try {
      return JSON.parse(cleaned) as ArticlePlan;
    } catch {
      console.warn('[PlanAgent] JSONパースに失敗しました。フォールバック構造を使用します。');
      return {
        title: topic,
        introduction: '',
        sections: [
          { title: '概要', description: topic },
          { title: '詳細', description: topic },
          { title: '応用', description: topic },
        ],
        conclusion: 'まとめ',
      };
    }
  }
}
