import { getEnv } from "@/env.js";
import type { AgentError } from "@/errors/index.js";

const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * AgentError かどうかを型ガードで判定
 */
function isAgentError(error: unknown): error is AgentError {
  return (
    typeof error === "object" &&
    error !== null &&
    "toDetailedString" in error &&
    typeof (error as AgentError).toDetailedString === "function"
  );
}

/**
 * エラーから詳細情報を取得
 */
function formatError(error: unknown): string {
  if (isAgentError(error)) {
    return error.toDetailedString();
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

export class Logger {
  private level: LogLevel;

  constructor() {
    const env = getEnv();
    this.level = env.LOG_LEVEL;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.level];
  }

  /**
   * エラーログ出力
   *
   * AgentError の場合は詳細情報（分類、プロバイダー、解決策）を含めて出力します。
   *
   * @param message - ログメッセージ
   * @param error - エラーオブジェクト（オプション）
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog("error")) {
      const timestamp = new Date().toISOString();
      if (error !== undefined) {
        console.error(`[${timestamp}] [ERROR] ${message}\n  ${formatError(error)}`);
      } else {
        console.error(`[${timestamp}] [ERROR] ${message}`);
      }
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog("warn")) console.warn("[WARN]", ...args);
  }

  info(...args: unknown[]): void {
    if (this.shouldLog("info")) console.log("[INFO]", ...args);
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog("debug")) console.log("[DEBUG]", ...args);
  }

  /**
   * リトライ状況のログ出力
   *
   * @param agentName - エージェント名
   * @param attempt - 試行回数
   * @param maxRetries - 最大リトライ回数
   * @param error - エラーオブジェクト
   * @param delayMs - 待機時間（ミリ秒）
   */
  retry(
    agentName: string,
    attempt: number,
    maxRetries: number,
    error: Error,
    delayMs: number,
  ): void {
    this.warn(`[${agentName}] リトライ ${attempt}/${maxRetries}: ${error.message}`);
    this.info(`[${agentName}] ${(delayMs / 1000).toFixed(1)}秒待機中...`);
  }
}

// 遅延初期化: 最初にアクセスされた時にのみ初期化
let _logger: Logger | null = null;

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop: keyof Logger) {
    if (!_logger) {
      _logger = new Logger();
    }
    return _logger[prop];
  },
});
