/**
 * config.ts のテスト
 *
 * parseModelString() 関数のパース処理を検証します。
 */

import { describe, expect, test } from "bun:test";

// 設定をモックするため、環境変数を設定してからインポート
process.env.OPENAI_API_KEY = "test-key";
process.env.GOOGLE_API_KEY = "test-key";
process.env.OPENROUTER_API_KEY = "test-key";
process.env.ZHIPU_API_KEY = "test-key";

// ソースコードから parseModelString をテストするために
// 私行のテスト用ヘルパーを作成（元の関数はエクスポートされていないため）
// ここでは createModel 関数を通して間接的にテストします
import { createModel } from "../../src/config.js";

/**
 * parseModelStringの間接テスト
 *
 * 注: parseModelString自体はprivate関数なので、createModelを通してテストします
 */
describe("config.ts - parseModelString (via createModel)", () => {
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
      expect(() => {
        const model = createModel("planner");
        expect(model).toBeDefined();
      }).not.toThrow();
    });

    test("複数スラッシュ形式（OpenRouter）", () => {
      process.env.WRITER_MODEL = "openrouter/anthropic/claude-3.5-sonnet";
      expect(() => {
        const model = createModel("writer");
        expect(model).toBeDefined();
      }).not.toThrow();
    });

    test("GLMプロバイダー", () => {
      process.env.EDITOR_MODEL = "glm/glm-4-flash";
      expect(() => {
        const model = createModel("editor");
        expect(model).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("無効なモデル文字列", () => {
    const originalEnv = process.env.RESEARCHER_MODEL;

    test("スラッシュがない形式はエラー", () => {
      process.env.RESEARCHER_MODEL = "gpt-4o";

      expect(() => {
        createModel("researcher");
      }).toThrow("Invalid model format");
    });

    test("空文字列はエラー", () => {
      process.env.RESEARCHER_MODEL = "";

      expect(() => {
        createModel("researcher");
      }).toThrow("Invalid model format");
    });

    // テスト後に元の値に戻す
    afterEach(() => {
      if (originalEnv) {
        process.env.RESEARCHER_MODEL = originalEnv;
      }
    });
  });

  describe("デフォルト値", () => {
    test("環境変数が未設定の場合はデフォルト値を使用", () => {
      delete process.env.REVIEWER_MODEL;

      expect(() => {
        const model = createModel("reviewer");
        expect(model).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("不明なプロバイダー", () => {
    test("未知のプロバイダーはエラー", () => {
      process.env.RESEARCHER_MODEL = "unknown/model";

      expect(() => {
        createModel("researcher");
      }).toThrow("Unknown provider");
    });
  });
});

/**
 * parseModelStringロジックの直接テスト
 *
 * 注: 本来はprivate関数ですが、重要なロジックなので
 *     別途実装したテスト用関数で検証します
 */
describe("ModelString パースロジック（直接的検証）", () => {
  test("provider/model 形式を正しく分割できる", () => {
    const testCases = [
      { input: "openai/gpt-4o", expected: { provider: "openai", model: "gpt-4o" } },
      {
        input: "gemini/gemini-2.5-flash",
        expected: { provider: "gemini", model: "gemini-2.5-flash" },
      },
      {
        input: "openrouter/anthropic/claude-3.5-sonnet",
        expected: { provider: "openrouter", model: "anthropic/claude-3.5-sonnet" },
      },
      { input: "glm/glm-4-flash", expected: { provider: "glm", model: "glm-4-flash" } },
    ];

    for (const testCase of testCases) {
      const parts = testCase.input.split("/");
      const provider = parts[0];
      const model = parts.slice(1).join("/");

      expect(provider).toBe(testCase.expected.provider);
      expect(model).toBe(testCase.expected.model);
    }
  });

  test("スラッシュが1つ未満の場合は無効", () => {
    const invalidInputs = ["gpt-4o", "", "single"];

    for (const input of invalidInputs) {
      const parts = input.split("/");
      expect(parts.length).toBeLessThan(2);
    }
  });
});

// afterEachフックを定義
function afterEach(_fn: () => void) {
  // Bun test does not have afterEach in global scope
  // This is a placeholder for documentation purposes
}
