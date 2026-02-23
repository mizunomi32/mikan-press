/**
 * env.ts のテスト
 *
 * 環境変数のバリデーション機能を検証します。
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { clearEnvCache, envSchema, getEnv, parseModelString, validateEnv } from "../../src/env.js";

// 元の環境変数をバックアップ
const originalEnv = { ...process.env };

// テスト間での干渉を防ぐためのデフォルトAPIキー
const DEFAULT_TEST_API_KEY = "test-key-for-env-test";

describe("env.ts", () => {
  beforeEach(() => {
    // キャッシュをクリア
    clearEnvCache();
    // テスト用の環境変数をクリア
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ZHIPU_API_KEY;
    delete process.env.GLM_BASE_URL;
    delete process.env.RESEARCHER_MODEL;
    delete process.env.PLANNER_MODEL;
    delete process.env.WRITER_MODEL;
    delete process.env.EDITOR_MODEL;
    delete process.env.REVIEWER_MODEL;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    // 環境変数を復元し、テスト間の干渉を防ぐためにAPIキーを設定
    Object.assign(process.env, originalEnv);
    process.env.OPENAI_API_KEY = DEFAULT_TEST_API_KEY;
    clearEnvCache();
  });

  describe("parseModelString", () => {
    test("provider/model 形式を正しくパースする", () => {
      expect(parseModelString("openai/gpt-4o")).toEqual({
        provider: "openai",
        model: "gpt-4o",
      });
    });

    test("複数スラッシュ形式を正しくパースする", () => {
      expect(parseModelString("openrouter/anthropic/claude-3.5-sonnet")).toEqual({
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
      });
    });

    test("geminiモデルを正しくパースする", () => {
      expect(parseModelString("gemini/gemini-2.5-flash")).toEqual({
        provider: "gemini",
        model: "gemini-2.5-flash",
      });
    });

    test("glmモデルを正しくパースする", () => {
      expect(parseModelString("glm/glm-4-flash")).toEqual({
        provider: "glm",
        model: "glm-4-flash",
      });
    });

    test("スラッシュがない形式はエラーを投げる", () => {
      expect(() => parseModelString("gpt-4o")).toThrow("Invalid model format");
    });

    test("空文字列はエラーを投げる", () => {
      expect(() => parseModelString("")).toThrow("Invalid model format");
    });
  });

  describe("validateEnv - APIキー", () => {
    test("APIキーが1つ以上あれば正常", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result = validateEnv();
      expect(result.OPENAI_API_KEY).toBe("sk-test");
    });

    test("Google APIキーのみでも正常", () => {
      process.env.GOOGLE_API_KEY = "google-test";
      const result = validateEnv();
      expect(result.GOOGLE_API_KEY).toBe("google-test");
    });

    test("OpenRouter APIキーのみでも正常", () => {
      process.env.OPENROUTER_API_KEY = "or-test";
      const result = validateEnv();
      expect(result.OPENROUTER_API_KEY).toBe("or-test");
    });

    test("ZHIPU APIキーのみでも正常", () => {
      process.env.ZHIPU_API_KEY = "zhipu-test";
      const result = validateEnv();
      expect(result.ZHIPU_API_KEY).toBe("zhipu-test");
    });

    test("APIキーが全くない場合はエラー", () => {
      expect(() => validateEnv()).toThrow();
    });

    test("空文字のAPIキーは未設定として扱う", () => {
      process.env.OPENAI_API_KEY = "";
      process.env.GOOGLE_API_KEY = "   "; // 空白のみ
      expect(() => validateEnv()).toThrow();
    });

    test("複数のAPIキーが設定されていても正常", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.GOOGLE_API_KEY = "google-test";
      const result = validateEnv();
      expect(result.OPENAI_API_KEY).toBe("sk-test");
      expect(result.GOOGLE_API_KEY).toBe("google-test");
    });
  });

  describe("validateEnv - モデル指定", () => {
    test("有効なモデル指定（provider/model 形式）", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.RESEARCHER_MODEL = "gemini/gemini-2.5-flash";
      const result = validateEnv();
      expect(result.RESEARCHER_MODEL).toBe("gemini/gemini-2.5-flash");
    });

    test("OpenRouterの複数スラッシュ形式", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.WRITER_MODEL = "openrouter/anthropic/claude-3.5-sonnet";
      const result = validateEnv();
      expect(result.WRITER_MODEL).toBe("openrouter/anthropic/claude-3.5-sonnet");
    });

    test("無効なプロバイダーはエラー", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.PLANNER_MODEL = "unknown/model";
      expect(() => validateEnv()).toThrow();
    });

    test("環境変数未設定時はデフォルト値", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result = validateEnv();
      expect(result.RESEARCHER_MODEL).toBe("openai/gpt-4o");
      expect(result.PLANNER_MODEL).toBe("openai/gpt-4o");
      expect(result.WRITER_MODEL).toBe("openai/gpt-4o");
      expect(result.EDITOR_MODEL).toBe("openai/gpt-4o");
      expect(result.REVIEWER_MODEL).toBe("openai/gpt-4o");
    });
  });

  describe("validateEnv - LOG_LEVEL", () => {
    test("有効なログレベル", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const levels = ["error", "warn", "info", "debug"] as const;
      for (const level of levels) {
        process.env.LOG_LEVEL = level;
        clearEnvCache();
        const result = validateEnv();
        expect(result.LOG_LEVEL).toBe(level);
      }
    });

    test("無効なログレベルはエラー", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.LOG_LEVEL = "invalid";
      expect(() => validateEnv()).toThrow();
    });

    test("未設定時はデフォルト info", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result = validateEnv();
      expect(result.LOG_LEVEL).toBe("info");
    });
  });

  describe("getEnv - シングルトン", () => {
    test("複数回呼び出しても同じインスタンスを返す", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result1 = getEnv();
      const result2 = getEnv();
      expect(result1).toBe(result2);
    });

    test("キャッシュクリア後に再取得すると新しい値を返す", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result1 = getEnv();

      clearEnvCache();
      process.env.OPENAI_API_KEY = "sk-test-2";
      const result2 = getEnv();

      expect(result2.OPENAI_API_KEY).toBe("sk-test-2");
    });
  });

  describe("envSchema", () => {
    test("スキーマが正しくエクスポートされている", () => {
      expect(envSchema).toBeDefined();
    });
  });
});
