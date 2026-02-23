/**
 * DuckDuckGoを使用したWeb検索ツール
 *
 * APIキー不要で無料のDuckDuckGo HTML版検索を使用します。
 * プライバシー重視の設計で、ユーザー追跡を行いません。
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Web検索の入力スキーマ
const webSearchInputSchema = z.object({
  query: z.string().describe("検索クエリ"),
  numResults: z.number().optional().default(5).describe("取得する検索結果数（デフォルト: 5）"),
});

/**
 * Web検索ツール
 *
 * DuckDuckGo HTML版検索エンドポイントを使用してWeb検索を実行します。
 * APIキー不要で完全無料で利用可能です。
 */
export class WebSearchTool extends StructuredTool {
  name = "web_search";

  description =
    "指定されたキーワードでWeb検索を行い、関連情報を返します（DuckDuckGo使用）。APIキー不要で無料。検索したいキーワードを指定してください。";

  // StructuredToolではZodオブジェクトスキーマを使用
  schema = webSearchInputSchema;

  /**
   * 検索実行
   *
   * @param input - 検索入力（{query: string, numResults?: number}）
   * @returns 検索結果のJSON文字列
   */
  async _call(input: z.infer<typeof webSearchInputSchema>): Promise<string> {
    const { query, numResults = 5 } = input;

    // 結果数の制限
    const limitedResults = Math.min(Math.max(1, numResults), 20);

    // DuckDuckGo HTML 版検索を使用
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; mikan-press/1.0; +https://github.com/mizunomi32/mikan-press)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
        },
        signal: AbortSignal.timeout(30000), // 30秒タイムアウト
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // HTML から検索結果を抽出
      const results = this.parseSearchResults(html, limitedResults);

      if (results.length === 0) {
        return JSON.stringify(
          {
            query,
            results: [],
            message: "検索結果が見つかりませんでした。検索キーワードを変更してください。",
          },
          null,
          2,
        );
      }

      return JSON.stringify(
        {
          query,
          resultCount: results.length,
          results,
        },
        null,
        2,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("検索がタイムアウトしました（30秒）。もう一度お試しください。");
        }
        throw error;
      }
      throw new Error("検索中に不明なエラーが発生しました");
    }
  }

  /**
   * HTMLから検索結果を抽出
   *
   * DuckDuckGo HTML レスポンスから検索結果を解析します。
   *
   * @param html - 検索結果ページのHTML
   * @param numResults - 取得する結果数
   * @returns 抽出された検索結果配列
   */
  private parseSearchResults(
    html: string,
    numResults: number,
  ): Array<{ title: string; url: string; snippet: string }> {
    const results: Array<{
      title: string;
      url: string;
      snippet: string;
    }> = [];

    // DuckDuckGo HTML検索結果の構造に合わせた正規表現
    // result__a クラス: タイトルとリンク
    // result__url クラス: URL表示
    // result__snippet クラス: 説明文

    const resultPattern =
      /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*class="result__a[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__url[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<class="[^"]*result__snippet[^"]*"[^>]*>([^<]*(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/a>/gi;

    let match: RegExpExecArray | null;
    let count = 0;

    // HTMLを正規化（改行・余分なスペースの削減）
    const normalizedHtml = html.replace(/\s+/g, " ");

    // biome-ignore lint/suspicious/noAssignInExpressions: RegExp.exec pattern requires assignment in condition
    while ((match = resultPattern.exec(normalizedHtml)) !== null && count < numResults) {
      const [, rawTitle, rawUrl, rawSnippet] = match;

      // 各キャプチャグループのundefinedチェック
      if (!rawTitle || !rawUrl || !rawSnippet) {
        continue;
      }

      // タイトルのクリーニング
      const title = rawTitle
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

      // URLのクリーニング
      const url = rawUrl
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lrm;/g, "")
        .trim();

      // スニペットのクリーニング
      const snippet = rawSnippet
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (title && url) {
        results.push({ title, url, snippet: snippet || "説明なし" });
        count++;
      }
    }

    // パースに失敗した場合のフォールバック（簡易パーサー）
    if (results.length === 0) {
      return this.parseSearchResultsFallback(html, numResults);
    }

    return results;
  }

  /**
   * フォールバック用の簡易パーサー
   *
   * メインのパーサーが失敗した場合に使用します。
   *
   * @param html - 検索結果ページのHTML
   * @param numResults - 取得する結果数
   * @returns 抽出された検索結果配列
   */
  private parseSearchResultsFallback(
    html: string,
    numResults: number,
  ): Array<{ title: string; url: string; snippet: string }> {
    const results: Array<{
      title: string;
      url: string;
      snippet: string;
    }> = [];

    // より単純なパターンで試行
    const linkPattern = /<a[^>]*class="result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const snippetPattern =
      /<a[^>]*class="result__snippet[^"]*"[^>]*>([^<]+(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/a>/gi;

    const links: Array<{ url: string; title: string }> = [];
    const snippets: string[] = [];

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: RegExp.exec pattern requires assignment in condition
    while ((match = linkPattern.exec(html)) !== null && links.length < numResults) {
      const rawUrl = match[1];
      const rawTitle = match[2];
      if (!rawUrl || !rawTitle) continue;
      const url = rawUrl.replace(/&amp;/g, "&").trim();
      const title = rawTitle.replace(/<[^>]*>/g, "").trim();
      if (url && title) {
        links.push({ url, title });
      }
    }

    let matchSnippet: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: RegExp.exec pattern requires assignment in condition
    while ((matchSnippet = snippetPattern.exec(html)) !== null && snippets.length < numResults) {
      const rawSnippet = matchSnippet[1];
      if (!rawSnippet) continue;
      const snippet = rawSnippet
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (snippet) {
        snippets.push(snippet);
      }
    }

    // 結合
    for (let i = 0; i < Math.min(links.length, numResults); i++) {
      const link = links[i];
      const snippet = snippets[i];
      if (link) {
        results.push({
          title: link.title,
          url: link.url,
          snippet: snippet || "説明なし",
        });
      }
    }

    return results;
  }
}

/**
 * WebSearchToolのシングルトンインスタンス
 */
export const webSearchTool = new WebSearchTool();
