import { chat, resolveModel } from '../clients/chat';
import { buildPlanPrompt } from '../prompts/plan';
import { logger } from '../logger';
import type { ArticlePlan, ResearchResult } from '../types/index';

function defaultSpec(): string {
  const zhipuModel = process.env.ZHIPU_MODEL ?? 'glm-4-flash';
  return `zhipu/${zhipuModel}`;
}

export class PlanAgent {
  private modelSpec: string;

  constructor(private language: string = 'ja') {
    this.modelSpec = resolveModel('PLAN_MODEL', defaultSpec());
  }

  async run(research: ResearchResult, feedback?: string): Promise<ArticlePlan> {
    logger.info('[PlanAgent] 記事構成を生成します...');
    let prompt = buildPlanPrompt(research, this.language);
    if (feedback) {
      prompt += `\n\n## 前回のレビューフィードバック\n以下の点を改善してください:\n${feedback}`;
    }
    const raw = await chat(this.modelSpec, [{ role: 'user', content: prompt }]);

    const parsed = this.parseJson(raw, research.topic);
    logger.info(`[PlanAgent] 完了: "${parsed.title}"`);
    return parsed;
  }

  private parseJson(raw: string, topic: string): ArticlePlan {
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    try {
      return JSON.parse(cleaned) as ArticlePlan;
    } catch {
      logger.warn('[PlanAgent] JSONパースに失敗しました。フォールバック構造を使用します。');
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
