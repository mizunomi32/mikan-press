/**
 * プロバイダー別エラー処理
 *
 * OpenAI, Gemini, OpenRouter, GLM の各プロバイダーが
 * スローするエラーを分類し、AgentError に変換します。
 */

import {
  AgentError,
  AuthenticationError,
  ErrorSeverity,
  MaxRetriesExceededError,
  ModelNotFoundError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  UnknownProviderError,
} from "./index.js";

// ============================================================================
// 型定義
// ============================================================================

/**
 * OpenAI API エラーの構造
 */
interface OpenAIErrorLike {
  status?: number;
  statusCode?: number;
  message?: string;
  error?: {
    type?: string;
    message?: string;
    code?: string;
  };
  code?: string;
}

/**
 * Google Gemini API エラーの構造
 */
interface GeminiErrorLike {
  status?: string;
  statusCode?: number;
  message?: string;
  details?: Array<{
    "@type"?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }>;
  code?: number;
}

/**
 * 一般的なHTTPエラーの構造
 */
interface HttpErrorLike {
  status?: number;
  statusCode?: number;
  statusText?: string;
  message?: string;
  code?: string;
}

// ============================================================================
// 型ガード関数
// ============================================================================

/**
 * OpenAIエラーかどうかを判定
 */
function isOpenAIError(error: unknown): error is OpenAIErrorLike {
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  // OpenAI SDK のエラーは status または error.type を持つ
  return (
    typeof e.status === "number" ||
    typeof e.error === "object" ||
    e.code === "rate_limit_exceeded" ||
    e.code === "invalid_api_key" ||
    e.code === "model_not_found"
  );
}

/**
 * Geminiエラーかどうかを判定
 */
function isGeminiError(error: unknown): error is GeminiErrorLike {
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  // Google API エラーは status または details を持つ
  return (
    typeof e.status === "string" ||
    Array.isArray(e.details) ||
    e.status === "RESOURCE_EXHAUSTED" ||
    e.status === "UNAVAILABLE"
  );
}

/**
 * ネットワークエラーかどうかを判定
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name?.toLowerCase() ?? "";
    return (
      name === "fetcherror" ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("econnreset") ||
      message.includes("socket hang up") ||
      message.includes("etimedout") ||
      message.includes("econnaborted")
    );
  }
  return false;
}

/**
 * タイムアウトエラーかどうかを判定
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("aborted")
    );
  }
  return false;
}

// ============================================================================
// プロバイダー別エラー分類関数
// ============================================================================

/**
 * OpenAIエラーを分類
 */
function classifyOpenAIError(error: OpenAIErrorLike): AgentError {
  const status = error.status ?? error.statusCode;
  const errorMessage = error.error?.message ?? error.message ?? "Unknown error";
  const errorCode = error.error?.code ?? error.code;

  // HTTPステータスコードによる分類
  if (status === 429 || errorCode === "rate_limit_exceeded") {
    return new RateLimitError(`OpenAI APIリクエスト制限に達しました: ${errorMessage}`, {
      provider: "openai",
      originalError: error as Error,
    });
  }

  if (status === 401 || errorCode === "invalid_api_key") {
    return new AuthenticationError(`OpenAI APIキーが無効です: ${errorMessage}`, {
      provider: "openai",
      originalError: error as Error,
    });
  }

  if (status === 404 || errorCode === "model_not_found") {
    return new ModelNotFoundError(`OpenAI モデルが見つかりません: ${errorMessage}`, {
      provider: "openai",
      originalError: error as Error,
    });
  }

  if (status === 500 || status === 502 || status === 503) {
    return new AgentError(
      `OpenAI サーバーエラー (${status}): ${errorMessage}。再試行します...`,
      ErrorSeverity.RETRYABLE,
      {
        provider: "openai",
        originalError: error as Error,
        resolutionHint: "サーバー側の一時的な問題です。しばらく待ってから再試行します",
      },
    );
  }

  if (status === 400) {
    return new AgentError(
      `OpenAI リクエストエラー: ${errorMessage}`,
      ErrorSeverity.USER_ERROR,
      {
        provider: "openai",
        originalError: error as Error,
        resolutionHint: "リクエストパラメータを確認してください",
      },
    );
  }

  // その他のエラー
  return new AgentError(`OpenAI API エラー: ${errorMessage}`, ErrorSeverity.FATAL, {
    provider: "openai",
    originalError: error as Error,
  });
}

/**
 * Geminiエラーを分類
 */
function classifyGeminiError(error: GeminiErrorLike): AgentError {
  const status = error.status;
  const errorMessage = error.message ?? "Unknown error";

  // Google API エラーステータスによる分類
  if (status === "RESOURCE_EXHAUSTED") {
    return new RateLimitError(`Gemini APIリクエスト制限に達しました: ${errorMessage}`, {
      provider: "gemini",
      originalError: error as Error,
    });
  }

  if (status === "UNAVAILABLE" || status === "DEADLINE_EXCEEDED") {
    return new AgentError(
      `Gemini サービスが一時的に利用できません: ${errorMessage}`,
      ErrorSeverity.RETRYABLE,
      {
        provider: "gemini",
        originalError: error as Error,
        resolutionHint: "一時的な問題です。再試行します",
      },
    );
  }

  if (status === "INVALID_ARGUMENT") {
    return new AgentError(`Gemini リクエストエラー: ${errorMessage}`, ErrorSeverity.USER_ERROR, {
      provider: "gemini",
      originalError: error as Error,
      resolutionHint: "リクエストパラメータまたはモデル名を確認してください",
    });
  }

  if (status === "PERMISSION_DENIED" || status === "UNAUTHENTICATED") {
    return new AuthenticationError(`Gemini 認証エラー: ${errorMessage}`, {
      provider: "gemini",
      originalError: error as Error,
    });
  }

  if (status === "NOT_FOUND") {
    return new ModelNotFoundError(`Gemini モデルが見つかりません: ${errorMessage}`, {
      provider: "gemini",
      originalError: error as Error,
    });
  }

  if (status === "INTERNAL") {
    return new AgentError(`Gemini 内部エラー: ${errorMessage}`, ErrorSeverity.RETRYABLE, {
      provider: "gemini",
      originalError: error as Error,
      resolutionHint: "サーバー側の一時的な問題です。再試行します",
    });
  }

  // その他のエラー
  return new AgentError(`Gemini API エラー: ${errorMessage}`, ErrorSeverity.FATAL, {
    provider: "gemini",
    originalError: error as Error,
  });
}

/**
 * OpenRouterエラーを分類（OpenAI互換APIのため類似の処理）
 */
function classifyOpenRouterError(error: HttpErrorLike): AgentError {
  const status = error.status ?? error.statusCode;
  const errorMessage = error.message ?? "Unknown error";

  if (status === 429) {
    return new RateLimitError(`OpenRouter APIリクエスト制限に達しました: ${errorMessage}`, {
      provider: "openrouter",
      originalError: error as Error,
    });
  }

  if (status === 401) {
    return new AuthenticationError(`OpenRouter APIキーが無効です: ${errorMessage}`, {
      provider: "openrouter",
      originalError: error as Error,
    });
  }

  if (status === 404) {
    return new ModelNotFoundError(`OpenRouter モデルが見つかりません: ${errorMessage}`, {
      provider: "openrouter",
      originalError: error as Error,
    });
  }

  if (status === 500 || status === 502 || status === 503) {
    return new AgentError(
      `OpenRouter サーバーエラー (${status}): ${errorMessage}`,
      ErrorSeverity.RETRYABLE,
      {
        provider: "openrouter",
        originalError: error as Error,
        resolutionHint: "プロキシサーバーの一時的な問題です。再試行します",
      },
    );
  }

  // その他のエラー
  return new AgentError(`OpenRouter API エラー: ${errorMessage}`, ErrorSeverity.FATAL, {
    provider: "openrouter",
    originalError: error as Error,
  });
}

/**
 * GLM (Zhipu AI) エラーを分類
 */
function classifyGLMError(error: HttpErrorLike): AgentError {
  const status = error.status ?? error.statusCode;
  const errorMessage = error.message ?? "Unknown error";

  if (status === 429) {
    return new RateLimitError(`GLM APIリクエスト制限に達しました: ${errorMessage}`, {
      provider: "glm",
      originalError: error as Error,
    });
  }

  if (status === 401) {
    return new AuthenticationError(`GLM APIキーが無効です: ${errorMessage}`, {
      provider: "glm",
      originalError: error as Error,
    });
  }

  if (status === 404) {
    return new ModelNotFoundError(`GLM モデルが見つかりません: ${errorMessage}`, {
      provider: "glm",
      originalError: error as Error,
    });
  }

  if (status === 500 || status === 502 || status === 503) {
    return new AgentError(
      `GLM サーバーエラー (${status}): ${errorMessage}`,
      ErrorSeverity.RETRYABLE,
      {
        provider: "glm",
        originalError: error as Error,
        resolutionHint: "サーバー側の一時的な問題です。再試行します",
      },
    );
  }

  // その他のエラー
  return new AgentError(`GLM API エラー: ${errorMessage}`, ErrorSeverity.FATAL, {
    provider: "glm",
    originalError: error as Error,
  });
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * エラーを分類して AgentError に変換
 *
 * @param error - 元のエラーオブジェクト
 * @param provider - プロバイダー名（openai/gemini/openrouter/glm）
 * @returns 分類された AgentError
 */
export function classifyError(error: unknown, provider: string): AgentError {
  // すでに AgentError の場合はそのまま返す
  if (error instanceof AgentError) {
    return error;
  }

  // ネットワークエラーのチェック（プロバイダー共通）
  if (isNetworkError(error)) {
    return new NetworkError(
      `ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`,
      { provider, originalError: error instanceof Error ? error : undefined },
    );
  }

  // タイムアウトエラーのチェック（プロバイダー共通）
  if (isTimeoutError(error)) {
    return new TimeoutError(
      `リクエストタイムアウト: ${error instanceof Error ? error.message : String(error)}`,
      { provider, originalError: error instanceof Error ? error : undefined },
    );
  }

  // プロバイダー別の分類
  switch (provider) {
    case "openai":
      if (isOpenAIError(error)) {
        return classifyOpenAIError(error);
      }
      break;

    case "gemini":
      if (isGeminiError(error)) {
        return classifyGeminiError(error);
      }
      // Geminiエラーの形式が異なる場合のフォールバック
      if (isOpenAIError(error)) {
        return classifyOpenAIError(error);
      }
      break;

    case "openrouter":
      if (isOpenAIError(error)) {
        return classifyOpenRouterError(error);
      }
      break;

    case "glm":
      if (isOpenAIError(error)) {
        return classifyGLMError(error);
      }
      break;

    default:
      return new UnknownProviderError(
        `不明なプロバイダー: ${provider}`,
        { provider, originalError: error instanceof Error ? error : undefined },
      );
  }

  // 不明なエラー形式の場合
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new AgentError(`予期しないエラー: ${errorMessage}`, ErrorSeverity.FATAL, {
    provider,
    originalError: error instanceof Error ? error : undefined,
  });
}

/**
 * エラーがリトライ可能かどうかを判定
 *
 * @param error - エラーオブジェクト
 * @param provider - プロバイダー名
 * @returns リトライ可能な場合は true
 */
export function isRetryableError(error: unknown, provider: string): boolean {
  const classified = classifyError(error, provider);
  return classified.isRetryable();
}

/**
 * 解決策のヒントを取得
 *
 * @param error - AgentError インスタンス
 * @returns 解決策の文字列
 */
export function getResolutionHint(error: AgentError): string {
  return error.resolutionHint ?? "管理者に連絡してください";
}
