/**
 * ターミナル用の思考中アニメーション（依存なし）
 * stderr に出すので logger の stdout と混ざらない
 */

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const TTY = process.stderr.isTTY;
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startSpinner(label: string): void {
  if (!TTY || intervalId) return;
  let i = 0;
  intervalId = setInterval(() => {
    process.stderr.write(`\r ${FRAMES[i++ % FRAMES.length]} ${label}  `);
  }, 80);
}

export function stopSpinner(clearLine = true): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    if (clearLine && TTY) process.stderr.write("\r\x1b[K");
  }
}

export function withSpinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  startSpinner(label);
  return fn().finally(() => stopSpinner());
}
