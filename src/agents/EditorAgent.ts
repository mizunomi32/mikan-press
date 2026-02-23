import { chat, resolveModel } from '../clients/chat';
import { buildEditorPrompt } from '../prompts/editor';
import type { Article } from '../types/index';

function defaultSpec(): string {
  const zhipuModel = process.env.ZHIPU_MODEL ?? 'glm-4-flash';
  return `zhipu/${zhipuModel}`;
}

export class EditorAgent {
  private modelSpec: string;

  constructor(private language: string = 'ja') {
    this.modelSpec = resolveModel('EDITOR_MODEL', defaultSpec());
  }

  async run(article: Article, feedback?: string): Promise<string> {
    console.log('[EditorAgent] 校正を開始します...');
    let prompt = buildEditorPrompt(article, this.language);
    if (feedback) {
      prompt += `\n\n## 前回のレビューフィードバック\n以下の点を改善してください:\n${feedback}`;
    }
    const result = await chat(this.modelSpec, [{ role: 'user', content: prompt }], {
      temperature: 0.5,
    });
    console.log('[EditorAgent] 校正完了');
    return result.trim();
  }
}
