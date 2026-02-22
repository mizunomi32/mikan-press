import { glmChat } from '../clients/glm';
import { buildEditorPrompt } from '../prompts/editor';
import type { Article } from '../types/index';

export class EditorAgent {
  constructor(private language: string = 'ja') {}

  async run(article: Article): Promise<string> {
    console.log('[EditorAgent] 校正を開始します...');
    const prompt = buildEditorPrompt(article, this.language);
    const result = await glmChat([{ role: 'user', content: prompt }], {
      temperature: 0.5,
    });
    console.log('[EditorAgent] 校正完了');
    return result.trim();
  }
}
