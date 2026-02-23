export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let cachedLevel: LogLevel | undefined;

function getLevel(): LogLevel {
  if (cachedLevel !== undefined) return cachedLevel;
  const env = process.env.LOG_LEVEL as string | undefined;
  if (env && env in LEVELS) {
    cachedLevel = env as LogLevel;
  } else {
    cachedLevel = 'info';
  }
  return cachedLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[getLevel()];
}

export const logger = {
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) console.log(...args);
  },
  info(...args: unknown[]): void {
    if (shouldLog('info')) console.log(...args);
  },
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(...args);
  },
  error(...args: unknown[]): void {
    if (shouldLog('error')) console.error(...args);
  },
  always(...args: unknown[]): void {
    console.log(...args);
  },
  _resetLevel(): void {
    cachedLevel = undefined;
  },
  _setLevel(l: LogLevel): void {
    cachedLevel = l;
  },
};
