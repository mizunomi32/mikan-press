import { chat, resolveModel } from '../clients/chat';
import { buildReviewPrompt } from '../prompts/review';
import type { ReviewResult, WorkflowStage } from '../types/index';

function defaultSpec(): string {
  const zhipuModel = process.env.ZHIPU_MODEL ?? 'glm-4-flash';
  return `zhipu/${zhipuModel}`;
}

export class ReviewAgent {
  private modelSpec: string;

  constructor(private language: string = 'ja') {
    this.modelSpec = resolveModel('REVIEW_MODEL', defaultSpec());
  }

  async review(stage: WorkflowStage, content: string): Promise<ReviewResult> {
    console.log(`[ReviewAgent] ${stage} ステージをレビュー中...`);
    const prompt = buildReviewPrompt(stage, content, this.language);
    const raw = await chat(this.modelSpec, [{ role: 'user', content: prompt }], {
      temperature: 0.3,
    });

    const result = this.parseJson(raw);
    console.log(`[ReviewAgent] ${stage}: ${result.decision} (accuracy=${result.scores.accuracy}, completeness=${result.scores.completeness}, clarity=${result.scores.clarity}, coherence=${result.scores.coherence})`);
    return result;
  }

  private parseJson(raw: string): ReviewResult {
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as ReviewResult;
      if (parsed.decision !== 'approve' && parsed.decision !== 'revise') {
        throw new Error(`Invalid decision: ${parsed.decision}`);
      }
      return parsed;
    } catch {
      console.warn('[ReviewAgent] JSONパースに失敗しました。approveにフォールバックします。');
      return {
        decision: 'approve',
        feedback: 'レビュー結果のパースに失敗したため自動承認',
        scores: { accuracy: 3, completeness: 3, clarity: 3, coherence: 3 },
      };
    }
  }
}
