const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private level: LogLevel;

  constructor() {
    const env = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
    this.level = LOG_LEVELS.includes(env as LogLevel)
      ? (env as LogLevel)
      : "info";
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

export const logger = new Logger();
