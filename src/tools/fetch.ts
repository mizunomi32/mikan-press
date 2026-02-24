/**
 * Webページ取得ツール
 *
 * 指定されたURLからWebページの内容を取得し、本文テキストを抽出します。
 * 検索結果のURLから詳細情報を取得するために使用します。
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// WebFetchの入力スキーマ
const webFetchInputSchema = z.object({
  url: z.string().url().describe("取得するページのURL"),
  maxLength: z.number().optional().default(5000).describe("抽出するテキストの最大文字数"),
});

/**
 * Webページ取得ツール
 *
 * 静的HTMLページから本文テキストを抽出します。
 * JavaScriptレンダリングが必要なページは対象外です。
 */
export class WebFetchTool extends StructuredTool {
  name = "web_fetch";

  description =
    "指定されたURLからWebページの内容を取得し、本文テキストを抽出します。検索結果のURLから詳細情報を取得する場合に使用してください。";

  // StructuredToolではZodオブジェクトスキーマを使用
  schema = webFetchInputSchema;

  /**
   * ページ取得実行
   *
   * @param input - 取得入力（{url: string, maxLength?: number}）
   * @returns 取得結果のJSON文字列
   */
  async _call(input: z.infer<typeof webFetchInputSchema>): Promise<string> {
    const { url, maxLength = 5000 } = input;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; mikan-press/1.0; +https://github.com/mizunomi32/mikan-press)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
        },
        signal: AbortSignal.timeout(30000), // 30秒タイムアウト
      });

      // 404やその他のHTTPエラー処理
      if (response.status === 404) {
        return JSON.stringify(
          {
            url,
            error: "ページが見つかりません（404）",
            content: "",
          },
          null,
          2,
        );
      }

      if (!response.ok) {
        return JSON.stringify(
          {
            url,
            error: `HTTPエラー: ${response.status} ${response.statusText}`,
            content: "",
          },
          null,
          2,
        );
      }

      // Content-Typeチェック
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        return JSON.stringify(
          {
            url,
            error: "HTML以外のコンテンツはサポートされていません",
            content: "",
          },
          null,
          2,
        );
      }

      const html = await response.text();

      // タイトル抽出
      const title = this.extractTitle(html);

      // HTMLから本文抽出
      const content = this.extractContent(html, maxLength);

      return JSON.stringify(
        {
          url,
          title,
          contentLength: content.fullLength,
          truncated: content.truncated,
          content: content.text,
        },
        null,
        2,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return JSON.stringify(
            {
              url,
              error: "リクエストがタイムアウトしました（30秒）",
              content: "",
            },
            null,
            2,
          );
        }
        return JSON.stringify(
          {
            url,
            error: `ネットワークエラー: ${error.message}`,
            content: "",
          },
          null,
          2,
        );
      }
      return JSON.stringify(
        {
          url,
          error: "不明なエラーが発生しました",
          content: "",
        },
        null,
        2,
      );
    }
  }

  /**
   * HTMLからタイトルを抽出
   *
   * @param html - HTML文字列
   * @returns タイトル文字列
   */
  private extractTitle(html: string): string {
    const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
    if (titleMatch?.[1]) {
      return this.cleanText(titleMatch[1]);
    }
    return "";
  }

  /**
   * HTMLから本文テキストを抽出
   *
   * 優先順位: <article> → <main> → <div class="content|post|article|entry"> → <body>
   *
   * @param html - HTML文字列
   * @param maxLength - 最大文字数
   * @returns 抽出されたテキストとメタ情報
   */
  private extractContent(
    html: string,
    maxLength: number,
  ): { text: string; fullLength: number; truncated: boolean } {
    // まずノイズを除去
    const cleanedHtml = this.removeNoise(html);

    // 本文コンテナを探す（優先順位順）
    let content = "";

    // 1. <article>タグを探す
    const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(cleanedHtml);
    if (articleMatch?.[1]) {
      content = articleMatch[1];
    }

    // 2. <main>タグを探す
    if (!content) {
      const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(cleanedHtml);
      if (mainMatch?.[1]) {
        content = mainMatch[1];
      }
    }

    // 3. コンテンツ系クラスのdivを探す
    if (!content) {
      const contentDivMatch =
        /<div[^>]*class="[^"]*(?:content|post|article|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(
          cleanedHtml,
        );
      if (contentDivMatch?.[1]) {
        content = contentDivMatch[1];
      }
    }

    // 4. <body>タグから抽出
    if (!content) {
      const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(cleanedHtml);
      if (bodyMatch?.[1]) {
        content = bodyMatch[1];
      }
    }

    // テキストを抽出・クリーニング
    let text = this.cleanText(content);

    // 文字数制限を適用
    const fullLength = text.length;
    const truncated = text.length > maxLength;

    if (truncated) {
      text = text.substring(0, maxLength);
      // 文の途中で切れないよう、最後の句点やピリオドで調整
      const lastPeriod = Math.max(
        text.lastIndexOf("。"),
        text.lastIndexOf("."),
        text.lastIndexOf("！"),
        text.lastIndexOf("?"),
      );
      if (lastPeriod > maxLength * 0.8) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    return { text, fullLength, truncated };
  }

  /**
   * ノイズ除去
   *
   * script, style, nav, header, footer, aside, form, HTMLコメントを除去
   *
   * @param html - HTML文字列
   * @returns クリーニングされたHTML
   */
  private removeNoise(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");
  }

  /**
   * テキストのクリーニング
   *
   * HTMLタグ除去、エンティティデコード、空白正規化
   *
   * @param html - HTML文字列
   * @returns クリーニングされたテキスト
   */
  private cleanText(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ") // HTMLタグ除去
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number.parseInt(num, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\s+/g, " ") // 連続空白を1つに
      .trim();
  }
}

/**
 * WebFetchToolのシングルトンインスタンス
 */
export const webFetchTool = new WebFetchTool();
