import { chat, resolveModel } from '../clients/chat';
import { buildResearchPrompt } from '../prompts/research';
import { logger } from '../logger';
import type { ResearchResult } from '../types/index';

const DEFAULT_SPEC = 'google/gemini-2.5-flash-lite';

export class ResearchAgent {
  private modelSpec: string;

  constructor(private language: string = 'ja') {
    this.modelSpec = resolveModel('RESEARCH_MODEL', DEFAULT_SPEC);
  }

  async run(topic: string, feedback?: string): Promise<ResearchResult> {
    logger.info('[ResearchAgent] リサーチを開始します...');
    let prompt = buildResearchPrompt(topic, this.language);
    if (feedback) {
      prompt += `\n\n## 前回のレビューフィードバック\n以下の点を改善してください:\n${feedback}`;
    }
    const raw = await chat(this.modelSpec, [{ role: 'user', content: prompt }]);

    const parsed = this.parseJson(raw, topic);
    logger.info('[ResearchAgent] リサーチ完了');
    return parsed;
  }

  private parseJson(raw: string, topic: string): ResearchResult {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    try {
      return JSON.parse(cleaned) as ResearchResult;
    } catch {
      // Fallback: return minimal structure
      logger.warn('[ResearchAgent] JSONパースに失敗しました。フォールバック構造を使用します。');
      return {
        topic,
        summary: raw.slice(0, 300),
        keyPoints: [],
        sources: [],
      };
    }
  }
}
