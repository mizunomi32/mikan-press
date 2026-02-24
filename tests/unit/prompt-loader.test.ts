/**
 * プロンプトリーダーのテスト
 */

import { describe, expect, it } from "bun:test";
import { clearPromptCache, loadPrompt } from "@/prompts/reader.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// テスト用のプロンプトディレクトリ
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testPromptsDir = join(__dirname, "../fixtures/prompts");

describe("PromptReader", () => {
  describe("loadPrompt", () => {
    it("YAMLファイルからプロンプトを読み込める", async () => {
      clearPromptCache();
      const prompt = await loadPrompt("researcher", 1, testPromptsDir);

      expect(prompt.version).toBe(1);
      expect(prompt.description).toBe("初期バージョンのリサーチャープロンプト");
      expect(prompt.author).toBe("mizunomi32");
      expect(prompt.system).toContain("あなたは優秀なリサーチャーです");
      expect(prompt.human).toContain("トピック: {topic}");
    });

    it("プロンプトファイルが見つからない場合はエラーを投げる", async () => {
      clearPromptCache();
      await expect(
        loadPrompt("nonexistent", 1, testPromptsDir),
      ).rejects.toThrow("プロンプトファイルが見つかりません");
    });

    it("同じバージョンのプロンプトを2回目はキャッシュから返す", async () => {
      clearPromptCache();
      const prompt1 = await loadPrompt("researcher", 1, testPromptsDir);
      const prompt2 = await loadPrompt("researcher", 1, testPromptsDir);

      // 同じオブジェクトインスタンスであることを確認（キャッシュ）
      expect(prompt1).toBe(prompt2);
    });

    it("clearPromptCacheでキャッシュをクリアできる", async () => {
      clearPromptCache();
      const prompt1 = await loadPrompt("researcher", 1, testPromptsDir);
      clearPromptCache();
      const prompt2 = await loadPrompt("researcher", 1, testPromptsDir);

      // 別のオブジェクトインスタンスであることを確認（キャッシュクリア後）
      expect(prompt1).not.toBe(prompt2);
      // 内容は同じであることを確認
      expect(prompt1.system).toBe(prompt2.system);
    });
  });

  describe("プロンプトファイルのバリデーション", () => {
    it("必須フィールドが含まれていることをチェックする", async () => {
      clearPromptCache();
      const prompt = await loadPrompt("researcher", 1, testPromptsDir);

      expect(prompt.system).toBeDefined();
      expect(prompt.human).toBeDefined();
      expect(prompt.version).toBeDefined();
      expect(typeof prompt.version).toBe("number");
    });

    it("メタデータが正しく設定されている", async () => {
      clearPromptCache();
      const prompt = await loadPrompt("researcher", 1, testPromptsDir);

      // YAMLファイルではISO 8601形式または日付形式
      expect(prompt.created_at).toBeTruthy();
      expect(prompt.description).toBeTruthy();
      expect(prompt.author).toBeTruthy();
    });
  });
});
