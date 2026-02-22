import { geminiChat } from '../clients/gemini';
import { buildResearchPrompt } from '../prompts/research';
import type { ResearchResult } from '../types/index';

export class ResearchAgent {
  constructor(private language: string = 'ja') {}

  async run(topic: string): Promise<ResearchResult> {
    console.log('[ResearchAgent] リサーチを開始します...');
    const prompt = buildResearchPrompt(topic, this.language);
    const raw = await geminiChat(prompt);

    const parsed = this.parseJson(raw, topic);
    console.log('[ResearchAgent] リサーチ完了');
    return parsed;
  }

  private parseJson(raw: string, topic: string): ResearchResult {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    try {
      return JSON.parse(cleaned) as ResearchResult;
    } catch {
      // Fallback: return minimal structure
      console.warn('[ResearchAgent] JSONパースに失敗しました。フォールバック構造を使用します。');
      return {
        topic,
        summary: raw.slice(0, 300),
        keyPoints: [],
        sources: [],
      };
    }
  }
}
