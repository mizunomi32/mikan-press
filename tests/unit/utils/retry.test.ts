import { describe, expect, it, vi } from "bun:test";
import { AgentError, ErrorSeverity, MaxRetriesExceededError } from "@/errors/index.js";
import {
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  withRetry,
} from "@/utils/retry.js";

describe("retry utils", () => {
  describe("calculateBackoffDelay", () => {
    it("初回(attempt=0)は initialDelayMs を返す", () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffFactor: 2,
      };
      expect(calculateBackoffDelay(0, config)).toBe(1000);
    });

    it("指数バックオフが正しく計算される", () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffFactor: 2,
      };
      expect(calculateBackoffDelay(0, config)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateBackoffDelay(1, config)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateBackoffDelay(2, config)).toBe(4000); // 1000 * 2^2 = 4000
      expect(calculateBackoffDelay(3, config)).toBe(8000); // 1000 * 2^3 = 8000
    });

    it("最大待機時間を超えない", () => {
      const config: RetryConfig = {
        maxRetries: 10,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffFactor: 2,
      };
      expect(calculateBackoffDelay(10, config)).toBe(5000); // 1000 * 2^10 = 1024000 だが maxDelayMs で制限
    });

    it("異なるバックオフ係数で正しく計算される", () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 500,
        maxDelayMs: 30000,
        backoffFactor: 3,
      };
      expect(calculateBackoffDelay(0, config)).toBe(500); // 500 * 3^0 = 500
      expect(calculateBackoffDelay(1, config)).toBe(1500); // 500 * 3^1 = 1500
      expect(calculateBackoffDelay(2, config)).toBe(4500); // 500 * 3^2 = 4500
    });
  });

  describe("withRetry", () => {
    it("成功時は結果をそのまま返す", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await withRetry(fn, DEFAULT_RETRY_CONFIG, "openai");
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("リトライ可能なエラーは指定回数リトライする", async () => {
      const retryableError = new AgentError("Rate limit", ErrorSeverity.RETRYABLE, {
        provider: "openai",
      });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue("success");

      const onRetry = vi.fn();

      // sleepをモック（Bunの方式）
      const originalSetTimeout = global.setTimeout;
      let _sleepCallCount = 0;
      global.setTimeout = ((callback: () => void) => {
        _sleepCallCount++;
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout;

      try {
        const result = await withRetry(fn, DEFAULT_RETRY_CONFIG, "openai", onRetry);
        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(3);
        expect(onRetry).toHaveBeenCalledTimes(2);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it("最大リトライ回数に達したら MaxRetriesExceededError をスロー", async () => {
      const retryableError = new AgentError("Rate limit", ErrorSeverity.RETRYABLE, {
        provider: "openai",
      });
      const fn = vi.fn().mockRejectedValue(retryableError);

      // sleepをモック
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout;

      try {
        await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, "openai")).rejects.toThrow(
          MaxRetriesExceededError,
        );
        expect(fn).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxRetries + 1); // 初回 + リトライ3回
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it("リトライ不可能なエラーは即座にスロー", async () => {
      const fatalError = new AgentError("Authentication failed", ErrorSeverity.USER_ERROR, {
        provider: "openai",
      });
      const fn = vi.fn().mockRejectedValue(fatalError);

      await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, "openai")).rejects.toThrow(AgentError);
      expect(fn).toHaveBeenCalledTimes(1); // リトライなし
    });

    it("FATAL エラーは即座にスロー", async () => {
      const fatalError = new AgentError("Fatal error", ErrorSeverity.FATAL, { provider: "openai" });
      const fn = vi.fn().mockRejectedValue(fatalError);

      await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, "openai")).rejects.toThrow(AgentError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("onRetryコールバックに正しい引数が渡される", async () => {
      const retryableError = new AgentError("Rate limit", ErrorSeverity.RETRYABLE, {
        provider: "openai",
      });
      const fn = vi.fn().mockRejectedValueOnce(retryableError).mockResolvedValue("success");

      const onRetry = vi.fn();

      // sleepをモック
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout;

      try {
        await withRetry(fn, DEFAULT_RETRY_CONFIG, "openai", onRetry);
        expect(onRetry).toHaveBeenCalledWith(1, retryableError, expect.any(Number));
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});
