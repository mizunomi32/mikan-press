import { getEnv } from "@/env.js";

const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  private level: LogLevel;

  constructor() {
    const env = getEnv();
    this.level = env.LOG_LEVEL;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.level];
  }

  error(...args: unknown[]): void {
    if (this.shouldLog("error")) console.error("[ERROR]", ...args);
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
