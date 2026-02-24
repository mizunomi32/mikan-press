import { describe, expect, it } from "bun:test";
import {
  AgentError,
  AuthenticationError,
  ErrorSeverity,
  ModelNotFoundError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "@/errors/index.js";
import { classifyError, getResolutionHint, isRetryableError } from "@/errors/providerErrors.js";

describe("providerErrors", () => {
  describe("classifyError - OpenAI", () => {
    it("429エラーは RateLimitError に分類される", () => {
      const error = { status: 429, message: "Rate limit exceeded" };
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
      expect(result.provider).toBe("openai");
    });

    it("401エラーは AuthenticationError に分類される", () => {
      const error = { status: 401, message: "Invalid API key" };
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.severity).toBe(ErrorSeverity.USER_ERROR);
      expect(result.provider).toBe("openai");
    });

    it("404エラーは ModelNotFoundError に分類される", () => {
      const error = { status: 404, message: "Model not found" };
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(ModelNotFoundError);
      expect(result.severity).toBe(ErrorSeverity.USER_ERROR);
    });

    it("500エラーは RETRYABLE に分類される", () => {
      const error = { status: 500, message: "Internal server error" };
      const result = classifyError(error, "openai");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
      expect(result.message).toContain("サーバーエラー");
    });

    it("502エラーは RETRYABLE に分類される", () => {
      const error = { status: 502, message: "Bad gateway" };
      const result = classifyError(error, "openai");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });

    it("503エラーは RETRYABLE に分類される", () => {
      const error = { status: 503, message: "Service unavailable" };
      const result = classifyError(error, "openai");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });

    it("400エラーは USER_ERROR に分類される", () => {
      const error = { status: 400, message: "Bad request" };
      const result = classifyError(error, "openai");

      expect(result.severity).toBe(ErrorSeverity.USER_ERROR);
    });

    it("rate_limit_exceeded コードは RateLimitError に分類される", () => {
      const error = { code: "rate_limit_exceeded", message: "Rate limit" };
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(RateLimitError);
    });
  });

  describe("classifyError - Gemini", () => {
    it("RESOURCE_EXHAUSTED は RateLimitError に分類される", () => {
      const error = { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" };
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
      expect(result.provider).toBe("gemini");
    });

    it("UNAVAILABLE は RETRYABLE に分類される", () => {
      const error = { status: "UNAVAILABLE", message: "Service temporarily unavailable" };
      const result = classifyError(error, "gemini");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
      expect(result.message).toContain("一時的に利用できません");
    });

    it("DEADLINE_EXCEEDED は RETRYABLE に分類される", () => {
      const error = { status: "DEADLINE_EXCEEDED", message: "Deadline exceeded" };
      const result = classifyError(error, "gemini");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });

    it("INVALID_ARGUMENT は USER_ERROR に分類される", () => {
      const error = { status: "INVALID_ARGUMENT", message: "Invalid argument" };
      const result = classifyError(error, "gemini");

      expect(result.severity).toBe(ErrorSeverity.USER_ERROR);
    });

    it("PERMISSION_DENIED は AuthenticationError に分類される", () => {
      const error = { status: "PERMISSION_DENIED", message: "Permission denied" };
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it("UNAUTHENTICATED は AuthenticationError に分類される", () => {
      const error = { status: "UNAUTHENTICATED", message: "Unauthenticated" };
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it("NOT_FOUND は ModelNotFoundError に分類される", () => {
      const error = { status: "NOT_FOUND", message: "Model not found" };
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(ModelNotFoundError);
    });

    it("INTERNAL は RETRYABLE に分類される", () => {
      const error = { status: "INTERNAL", message: "Internal error" };
      const result = classifyError(error, "gemini");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });
  });

  describe("classifyError - OpenRouter", () => {
    it("429エラーは RateLimitError に分類される", () => {
      const error = { status: 429, message: "Rate limit exceeded" };
      const result = classifyError(error, "openrouter");

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.provider).toBe("openrouter");
    });

    it("401エラーは AuthenticationError に分類される", () => {
      const error = { status: 401, message: "Invalid API key" };
      const result = classifyError(error, "openrouter");

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it("500エラーは RETRYABLE に分類される", () => {
      const error = { status: 500, message: "Server error" };
      const result = classifyError(error, "openrouter");

      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
      expect(result.resolutionHint).toContain("プロキシサーバー");
    });
  });

  describe("classifyError - GLM", () => {
    it("429エラーは RateLimitError に分類される", () => {
      const error = { status: 429, message: "Rate limit exceeded" };
      const result = classifyError(error, "glm");

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.provider).toBe("glm");
    });

    it("401エラーは AuthenticationError に分類される", () => {
      const error = { status: 401, message: "Invalid API key" };
      const result = classifyError(error, "glm");

      expect(result).toBeInstanceOf(AuthenticationError);
    });
  });

  describe("classifyError - ネットワークエラー", () => {
    it("network エラーメッセージは NetworkError に分類される", () => {
      const error = new Error("network error");
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(NetworkError);
      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });

    it("ECONNREFUSED は NetworkError に分類される", () => {
      const error = new Error("ECONNREFUSED");
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(NetworkError);
    });

    it("ENOTFOUND は NetworkError に分類される", () => {
      const error = new Error("ENOTFOUND api.openai.com");
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(NetworkError);
    });
  });

  describe("classifyError - タイムアウトエラー", () => {
    it("timeout エラーメッセージは TimeoutError に分類される", () => {
      const error = new Error("Request timeout");
      const result = classifyError(error, "openai");

      expect(result).toBeInstanceOf(TimeoutError);
      expect(result.severity).toBe(ErrorSeverity.RETRYABLE);
    });

    it("timed out は TimeoutError に分類される", () => {
      const error = new Error("Request timed out after 30000ms");
      const result = classifyError(error, "gemini");

      expect(result).toBeInstanceOf(TimeoutError);
    });
  });

  describe("classifyError - 既存のAgentError", () => {
    it("既に AgentError の場合はそのまま返す", () => {
      const originalError = new AgentError("Original error", ErrorSeverity.FATAL, {
        provider: "openai",
      });
      const result = classifyError(originalError, "openai");

      expect(result).toBe(originalError);
    });
  });

  describe("classifyError - 不明なエラー", () => {
    it("不明なプロバイダーの場合は UnknownProviderError", () => {
      const error = new Error("Some error");
      const result = classifyError(error, "unknown_provider");

      expect(result.name).toBe("UnknownProviderError");
    });

    it("不明なエラー形式は FATAL に分類される", () => {
      const error = { foo: "bar" };
      const result = classifyError(error, "openai");

      expect(result.severity).toBe(ErrorSeverity.FATAL);
    });
  });

  describe("isRetryableError", () => {
    it("RETRYABLE エラーは true を返す", () => {
      const error = { status: 429, message: "Rate limit" };
      expect(isRetryableError(error, "openai")).toBe(true);
    });

    it("USER_ERROR は false を返す", () => {
      const error = { status: 401, message: "Invalid API key" };
      expect(isRetryableError(error, "openai")).toBe(false);
    });

    it("FATAL は false を返す", () => {
      const error = { status: 400, message: "Bad request" };
      // 400はUSER_ERRORなのでfalseになる
      expect(isRetryableError(error, "openai")).toBe(false);
    });
  });

  describe("getResolutionHint", () => {
    it("resolutionHint がある場合はそれを返す", () => {
      const error = new AgentError("Error", ErrorSeverity.USER_ERROR, {
        provider: "openai",
        resolutionHint: "APIキーを確認してください",
      });
      expect(getResolutionHint(error)).toBe("APIキーを確認してください");
    });

    it("resolutionHint がない場合はデフォルトメッセージを返す", () => {
      const error = new AgentError("Error", ErrorSeverity.FATAL);
      expect(getResolutionHint(error)).toBe("管理者に連絡してください");
    });
  });
});
