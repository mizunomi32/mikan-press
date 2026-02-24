/**
 * リトライポリシーと指数バックオフ
 *
 * LLM API呼び出し時の一時的なエラーに対して、
 * 指数バックオフによるリトライを実行します。
 */

import { MaxRetriesExceededError } from "@/errors/index.js";
import { classifyError } from "@/errors/providerErrors.js";
import { logger } from "@/logger.js";

// ============================================================================
// 型定義
// ============================================================================

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** 初期待機時間（ミリ秒） */
  initialDelayMs: number;
  /** 最大待機時間（ミリ秒） */
  maxDelayMs: number;
  /** バックオフ係数 */
  backoffFactor: number;
}

/**
 * リトライ時のコールバック関数
 */
export type RetryCallback = (attempt: number, error: Error, delayMs: number) => void;

// ============================================================================
// デフォルト設定
// ============================================================================

/**
 * デフォルトのリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 指定時間待機
 *
 * @param ms - 待機時間（ミリ秒）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフの待機時間を計算
 *
 * @param attempt - 現在の試行回数（0始まり）
 * @param config - リトライ設定
 * @returns 待機時間（ミリ秒）
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * config.backoffFactor ** attempt;
  return Math.min(delay, config.maxDelayMs);
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * リトライロジック付きで関数を実行
 *
 * @param fn - 実行する非同期関数
 * @param config - リトライ設定
 * @param provider - プロバイダー名（エラー分類用）
 * @param onRetry - リトライ時のコールバック（オプション）
 * @returns 関数の実行結果
 * @throws MaxRetriesExceededError 最大リトライ回数を超えた場合
 * @throws AgentError リトライ不可能なエラーの場合
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  provider: string,
  onRetry?: RetryCallback,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // エラーを分類
      const classified = classifyError(error, provider);

      // リトライ不可能なエラーは即座にスロー
      if (!classified.isRetryable()) {
        throw classified;
      }

      lastError = classified;

      // 最大リトライ回数に達した場合
      if (attempt === config.maxRetries) {
        throw new MaxRetriesExceededError(
          `${provider} API: 最大リトライ回数(${config.maxRetries})を超えました`,
          {
            provider,
            originalError: classified,
            attempts: attempt + 1,
          },
        );
      }

      // バックオフ時間を計算
      const delay = calculateBackoffDelay(attempt, config);

      // リトライコールバックを実行
      if (onRetry) {
        onRetry(attempt + 1, classified, delay);
      }

      // 待機
      await sleep(delay);
    }
  }

  // ここには到達しないはずだが、TypeScriptの型チェックのため
  throw lastError ?? new Error("Unexpected error in retry logic");
}

/**
 * モデル呼び出し用のリトライラッパー
 *
 * エージェント名を含むログ出力を行い、リトライ状況を分かりやすく表示します。
 *
 * @param fn - モデル呼び出し関数
 * @param agentName - エージェント名
 * @param provider - プロバイダー名
 * @param config - リトライ設定
 * @returns モデル呼び出しの結果
 */
export async function withModelRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  provider: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  return withRetry(fn, config, provider, (attempt, error, delay) => {
    logger.warn(`[${agentName}] リトライ ${attempt}/${config.maxRetries}: ${error.message}`);
    logger.info(`[${agentName}] ${(delay / 1000).toFixed(1)}秒待機中...`);
  });
}
