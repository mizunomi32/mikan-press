import type { Article } from '../types/index';

export function buildEditorPrompt(article: Article, language: string): string {
  const fullText = [
    `# ${article.title}`,
    '',
    article.sections.find((s) => s.title === '__intro')?.content ?? '',
    '',
    ...article.sections
      .filter((s) => s.title !== '__intro' && s.title !== '__conclusion')
      .flatMap((s) => [`## ${s.title}`, '', s.content, '']),
    article.sections.find((s) => s.title === '__conclusion')?.content ?? '',
  ].join('\n');

  return `あなたはプロの編集者です。以下の記事を校正・改善してください。

出力言語: ${language === 'ja' ? '日本語' : 'English'}

チェック項目:
- 文体・トーンの一貫性
- 不自然な表現・誤字脱字の修正
- 段落間のつながりの改善
- 読みやすさの向上

以下の記事を改善して、完成版をMarkdown形式で返してください。
構造（見出し・段落）は維持してください。

---
${fullText}
---

改善後の記事全文のみを返してください。説明文は不要です。`;
}
