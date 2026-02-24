/**
 * 出力フォーマット変換ユーティリティ
 *
 * 記事の内容を様々なフォーマットに変換します。
 */

/**
 * サポートする出力フォーマット
 */
export type OutputFormat = "markdown" | "html" | "json" | "text";

/**
 * Markdown形式のコンテンツをそのまま返す
 *
 * @param content - Markdown形式のコンテンツ
 * @returns Markdown形式のコンテンツ
 */
export function toMarkdown(content: string): string {
  return content;
}

/**
 * Markdown形式のコンテンツをHTMLに変換する
 *
 * @param content - Markdown形式のコンテンツ
 * @returns HTML形式のコンテンツ
 */
export function toHtml(content: string): string {
  let html = content;

  // 見出し (h1-h6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 太字
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // コードブロック
  html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>');

  // インラインコード
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // リンク
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 箇条書きリスト
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)\n(?!<li>)/g, '$1</ul>\n');
  html = html.replace(/(?<!<\/ul>\n)(<li>)/g, '<ul>$1');

  // 段落
  html = html.replace(/^(?!<[h|u|p|pre])(.+)$/gm, '<p>$1</p>');
  html = html.replace(/<\/p>\n<p>/g, '</p><p>');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>記事</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    ul, ol { padding-left: 20px; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Markdown形式のコンテンツをJSONに変換する
 *
 * @param content - Markdown形式のコンテンツ
 * @returns JSON形式のコンテンツ
 */
export function toJson(content: string): string {
  const lines = content.split("\n");
  const sections: { type: string; content: string; level?: number }[] = [];
  let currentParagraph = "";

  for (const line of lines) {
    // 見出し
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      const hashMark = headingMatch[1] ?? "#";
      const headingText = headingMatch[2] ?? "";
      const level = hashMark.length;
      sections.push({ type: "heading", content: headingText, level });
      continue;
    }

    // コードブロック
    if (line.startsWith("```")) {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      continue;
    }

    // 空行
    if (line.trim() === "") {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      continue;
    }

    // 段落
    currentParagraph += (currentParagraph ? " " : "") + line;
  }

  if (currentParagraph) {
    sections.push({ type: "paragraph", content: currentParagraph.trim() });
  }

  return JSON.stringify(
    {
      format: "markdown",
      generatedAt: new Date().toISOString(),
      sections,
    },
    null,
    2,
  );
}

/**
 * Markdown形式のコンテンツをプレーンテキストに変換する
 *
 * @param content - Markdown形式のコンテンツ
 * @returns プレーンテキスト形式のコンテンツ
 */
export function toPlainText(content: string): string {
  let text = content;

  // 見出し記号を削除
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 太字記号を削除
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");

  // 斜体記号を削除
  text = text.replace(/\*(.+?)\*/g, "$1");

  // コードブロック記号を削除
  text = text.replace(/```\w*\n?/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  // リンク記号を削除
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // 箇条書き記号を削除
  text = text.replace(/^\*\s+/gm, "• ");
  text = text.replace(/^\d+\.\s+/gm, "");

  return text;
}

/**
 * 指定されたフォーマットにコンテンツを変換する
 *
 * @param content - Markdown形式のコンテンツ
 * @param format - 出力フォーマット
 * @returns 変換後のコンテンツ
 */
export function formatContent(content: string, format: OutputFormat): string {
  switch (format) {
    case "markdown":
      return toMarkdown(content);
    case "html":
      return toHtml(content);
    case "json":
      return toJson(content);
    case "text":
      return toPlainText(content);
    default:
      // TypeScriptの exhaustive check を満たすため
      const _exhaustiveCheck: never = format;
      throw new Error(`Unsupported format: ${_exhaustiveCheck}`);
  }
}
