/**
 * URL検証ツール
 *
 * 指定されたURLが有効かどうかを検証します。
 * 404エラーやアクセス不能なURLを検出します。
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// URL検証の入力スキーマ
const urlValidatorInputSchema = z.object({
  urls: z.array(z.string().url()).max(10).describe("検証するURLのリスト（最大10件）"),
  timeout: z.number().optional().default(5000).describe("各URLのタイムアウト（ミリ秒）"),
});

/** 検証結果の型 */
interface URLValidationResult {
  url: string;
  status: "valid" | "redirect" | "invalid";
  statusCode?: number;
  finalUrl?: string;
  error?: string;
}

/** サマリーの型 */
interface URLValidationSummary {
  total: number;
  valid: number;
  redirect: number;
  invalid: number;
}

/** 全体の結果の型 */
interface URLValidationOutput {
  results: URLValidationResult[];
  summary: URLValidationSummary;
}

/** リダイレクト追跡の最大回数 */
const MAX_REDIRECTS = 5;

/**
 * URL検証ツール
 *
 * HEADリクエストを使用してURLの有効性を軽量に検証します。
 */
export class URLValidatorTool extends StructuredTool {
  name = "url_validator";

  description =
    "指定されたURLが有効かどうかを検証します。404エラーやアクセス不能なURLを検出します。記事内の参照リンクの妥当性を確認する場合に使用してください。";

  // StructuredToolではZodオブジェクトスキーマを使用
  schema = urlValidatorInputSchema;

  /**
   * URL検証実行
   *
   * @param input - 検証入力（{urls: string[], timeout?: number}）
   * @returns 検証結果のJSON文字列
   */
  async _call(input: z.infer<typeof urlValidatorInputSchema>): Promise<string> {
    const { urls, timeout = 5000 } = input;

    // 複数URLを並列検証
    const results = await Promise.all(urls.map((url) => this.validateSingleUrl(url, timeout)));

    // サマリーを集計
    const summary: URLValidationSummary = {
      total: results.length,
      valid: results.filter((r) => r.status === "valid").length,
      redirect: results.filter((r) => r.status === "redirect").length,
      invalid: results.filter((r) => r.status === "invalid").length,
    };

    const output: URLValidationOutput = {
      results,
      summary,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * 単一URLの検証
   *
   * HEADリクエストでステータスコードを確認し、リダイレクトを追跡します。
   *
   * @param url - 検証対象のURL
   * @param timeout - タイムアウト（ミリ秒）
   * @returns 検証結果
   */
  private async validateSingleUrl(url: string, timeout: number): Promise<URLValidationResult> {
    try {
      // リダイレクトを追跡しながらHEADリクエスト
      const result = await this.followRedirects(url, timeout, 0);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            url,
            status: "invalid",
            error: "リクエストがタイムアウトしました",
          };
        }
        return {
          url,
          status: "invalid",
          error: `ネットワークエラー: ${error.message}`,
        };
      }
      return {
        url,
        status: "invalid",
        error: "不明なエラーが発生しました",
      };
    }
  }

  /**
   * リダイレクト追跡付きHEADリクエスト
   *
   * redirect: "manual" でリダイレクトを手動追跡し、最終URLを取得します。
   *
   * @param url - 検証対象のURL
   * @param timeout - タイムアウト（ミリ秒）
   * @param redirectCount - 現在のリダイレクト回数
   * @returns 検証結果
   */
  private async followRedirects(
    url: string,
    timeout: number,
    redirectCount: number,
  ): Promise<URLValidationResult> {
    // リダイレクト回数の上限チェック
    if (redirectCount > MAX_REDIRECTS) {
      return {
        url,
        status: "invalid",
        error: `リダイレクト回数が上限(${MAX_REDIRECTS})を超えました`,
      };
    }

    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual", // 手動でリダイレクトを追跡
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; mikan-press/1.0; +https://github.com/mizunomi32/mikan-press)",
          Accept: "*/*",
        },
        signal: AbortSignal.timeout(timeout),
      });

      const statusCode = response.status;

      // 2xx - 有効
      if (statusCode >= 200 && statusCode < 300) {
        return {
          url,
          status: "valid",
          statusCode,
          finalUrl: url,
        };
      }

      // 3xx - リダイレクト
      if (statusCode >= 300 && statusCode < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            url,
            status: "invalid",
            statusCode,
            error: "リダイレクト先が見つかりません",
          };
        }

        // 相対URLを絶対URLに変換
        const redirectUrl = new URL(location, url).toString();

        // リダイレクト先を追跡
        const redirectResult = await this.followRedirects(redirectUrl, timeout, redirectCount + 1);

        // リダイレクト先でエラーが発生した場合はエラーを伝播
        if (redirectResult.status === "invalid") {
          return {
            url,
            status: "invalid",
            statusCode,
            error: redirectResult.error,
            finalUrl: redirectUrl,
          };
        }

        // 元のURL情報を保持
        return {
          url,
          status: "redirect",
          statusCode,
          finalUrl: redirectResult.finalUrl ?? redirectUrl,
        };
      }

      // 4xx/5xx - 無効
      const statusText = response.statusText || this.getStatusText(statusCode);
      return {
        url,
        status: "invalid",
        statusCode,
        error: statusText,
      };
    } catch (error) {
      // タイムアウトエラーの特殊処理
      if (error instanceof Error && error.name === "AbortError") {
        return {
          url,
          status: "invalid",
          error: "リクエストがタイムアウトしました",
        };
      }
      throw error;
    }
  }

  /**
   * ステータスコードからテキストを取得
   *
   * @param statusCode - HTTPステータスコード
   * @returns ステータステキスト
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      408: "Request Timeout",
      410: "Gone",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };
    return statusTexts[statusCode] ?? `HTTP Error ${statusCode}`;
  }
}

/**
 * URLValidatorToolのシングルトンインスタンス
 */
export const urlValidatorTool = new URLValidatorTool();
