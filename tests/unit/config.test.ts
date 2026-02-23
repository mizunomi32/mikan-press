/**
 * config.ts のテスト
 *
 * createModel() 関数の動作を検証します。
 * parseModelString() のテストは env.test.ts に移動しました。
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";

// テスト実行前に環境変数を設定
// env.ts や logger.ts が読み込まれる前に設定する必要がある
const originalEnv = { ...process.env };

// テスト用のデフォルト環境変数を設定
function setupTestEnv(): void {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GOOGLE_API_KEY = "test-key";
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.ZHIPU_API_KEY = "test-key";
}

// テスト開始前に環境変数を設定
setupTestEnv();

// 環境変数設定後にモジュールをインポート
import { clearEnvCache } from "../../src/env.js";
import { createModel } from "../../src/config.js";

beforeEach(() => {
  clearEnvCache();
  setupTestEnv();
});

afterEach(() => {
  clearEnvCache();
  // 環境変数を復元
  Object.assign(process.env, originalEnv);
});

/**
 * parseModelStringの間接テスト
 *
 * 注: parseModelString自体はenv.tsに移動しました
 */
describe("config.ts - createModel", () => {
  describe("有効なモデル文字列", () => {
    test("openai/gpt-4o を正しくパース", () => {
      // エラーが投げられなければパース成功
      expect(() => {
        const model = createModel("researcher");
        expect(model).toBeDefined();
      }).not.toThrow();
    });

    test("環境変数で設定されたモデルを使用", () => {
      process.env.PLANNER_MODEL = "gemini/gemini-2.5-flash";
      clearEnvCache();
      expect(() => {
        const model = createModel("planner");
        expect(model).toBeDefined();
      }).not.toThrow();
    });

    test("複数スラッシュ形式（OpenRouter）", () => {
      process.env.WRITER_MODEL = "openrouter/anthropic/claude-3.5-sonnet";
      clearEnvCache();
      expect(() => {
        const model = createModel("writer");
        expect(model).toBeDefined();
      }).not.toThrow();
    });

    test("GLMプロバイダー", () => {
      process.env.EDITOR_MODEL = "glm/glm-4-flash";
      clearEnvCache();
      expect(() => {
        const model = createModel("editor");
        expect(model).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("無効なモデル文字列", () => {
    test("スラッシュがない形式はエラー", () => {
      process.env.RESEARCHER_MODEL = "gpt-4o";
      clearEnvCache();

      expect(() => {
        createModel("researcher");
      }).toThrow("Invalid model format");
    });

    test("空文字列はデフォルト値を使用", () => {
      process.env.RESEARCHER_MODEL = "";
      clearEnvCache();

      // 空文字は未設定として扱われ、デフォルト値が使われる
      expect(() => {
        const model = createModel("researcher");
        expect(model).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("デフォルト値", () => {
    test("環境変数が未設定の場合はデフォルト値を使用", () => {
      delete process.env.REVIEWER_MODEL;
      clearEnvCache();

      expect(() => {
        const model = createModel("reviewer");
        expect(model).toBeDefined();
      }).not.toThrow();
    });
  });
});
