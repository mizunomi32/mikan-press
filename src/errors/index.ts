/**
 * エラー分類システム
 *
 * LLM API呼び出し時のエラーを分類し、適切な対応アクションを決定するための
 * カスタムエラークラスと分類定義を提供します。
 */

/**
 * エラーの重要度分類
 */
export enum ErrorSeverity {
  /** リトライ可能（一時的なエラー） */
  RETRYABLE = "retryable",
  /** 致命的（リトライ不可） */
  FATAL = "fatal",
  /** ユーザー設定の問題 */
  USER_ERROR = "user_error",
}

/**
 * エージェント実行時のカスタムエラークラス
 *
 * LLM API呼び出しで発生したエラーを分類し、
 * ユーザーに分かりやすいメッセージと解決策を提供します。
 */
export class AgentError extends Error {
  /** エラーの重要度分類 */
  public readonly severity: ErrorSeverity;
  /** エラーが発生したプロバイダー（openai/gemini/openrouter/glm） */
  public readonly provider?: string;
  /** 元のエラーオブジェクト */
  public readonly originalError?: Error;
  /** 解決策のヒント */
  public readonly resolutionHint?: string;

  constructor(
    message: string,
    severity: ErrorSeverity,
    options?: {
      provider?: string;
      originalError?: Error;
      resolutionHint?: string;
    },
  ) {
    super(message);
    this.name = "AgentError";
    this.severity = severity;
    this.provider = options?.provider;
    this.originalError = options?.originalError;
    this.resolutionHint = options?.resolutionHint;

    // プロトタイプチェーンを正しく設定（TypeScript向け）
    Object.setPrototypeOf(this, AgentError.prototype);
  }

  /**
   * エラーがリトライ可能かどうかを判定
   */
  isRetryable(): boolean {
    return this.severity === ErrorSeverity.RETRYABLE;
  }

  /**
   * ユーザー設定の問題かどうかを判定
   */
  isUserError(): boolean {
    return this.severity === ErrorSeverity.USER_ERROR;
  }

  /**
   * 致命的なエラーかどうかを判定
   */
  isFatal(): boolean {
    return this.severity === ErrorSeverity.FATAL;
  }

  /**
   * 詳細なエラー情報を文字列で取得
   */
  toDetailedString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.provider) {
      result += `\n  プロバイダー: ${this.provider}`;
    }
    result += `\n  分類: ${this.severity}`;
    if (this.resolutionHint) {
      result += `\n  解決策: ${this.resolutionHint}`;
    }
    return result;
  }
}

/**
 * APIレート制限エラー
 */
export class RateLimitError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
      retryAfterMs?: number;
    },
  ) {
    super(message, ErrorSeverity.RETRYABLE, {
      ...options,
      resolutionHint: "しばらく待ってから再試行してください",
    });
    this.name = "RateLimitError";
    this.retryAfterMs = options?.retryAfterMs;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  /** 再試行までの推奨待機時間（ミリ秒） */
  public readonly retryAfterMs?: number;
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    },
  ) {
    super(message, ErrorSeverity.USER_ERROR, {
      ...options,
      resolutionHint: "APIキーが正しく設定されているか確認してください",
    });
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * モデル不存在エラー
 */
export class ModelNotFoundError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    },
  ) {
    super(message, ErrorSeverity.USER_ERROR, {
      ...options,
      resolutionHint: "モデル名が正しいか確認してください",
    });
    this.name = "ModelNotFoundError";
    Object.setPrototypeOf(this, ModelNotFoundError.prototype);
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    },
  ) {
    super(message, ErrorSeverity.RETRYABLE, {
      ...options,
      resolutionHint: "ネットワーク接続を確認してください",
    });
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    },
  ) {
    super(message, ErrorSeverity.RETRYABLE, {
      ...options,
      resolutionHint: "リクエストがタイムアウトしました。再試行します",
    });
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * 最大リトライ回数超過エラー
 */
export class MaxRetriesExceededError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
      attempts: number;
    },
  ) {
    super(message, ErrorSeverity.FATAL, {
      ...options,
      resolutionHint: "複数回の再試行が失敗しました。しばらく待ってから再実行してください",
    });
    this.name = "MaxRetriesExceededError";
    this.attempts = options?.attempts ?? 0;
    Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
  }

  /** 試行回数 */
  public readonly attempts: number;
}

/**
 * 不明なエラー
 */
export class UnknownProviderError extends AgentError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    },
  ) {
    super(message, ErrorSeverity.USER_ERROR, {
      ...options,
      resolutionHint: "プロバイダー名が正しいか確認してください（openai/gemini/openrouter/glm）",
    });
    this.name = "UnknownProviderError";
    Object.setPrototypeOf(this, UnknownProviderError.prototype);
  }
}
