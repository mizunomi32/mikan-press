/**
 * fetch.ts のテスト
 *
 * Web Fetchツールの機能を検証します。
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { webFetchTool } from "../../src/tools/fetch.js";
import { resetFetchCache } from "../../src/utils/cache.js";

describe("fetch.ts", () => {
  beforeEach(() => {
    resetFetchCache();
  });

  afterEach(() => {
    resetFetchCache();
  });

  describe("WebFetchTool", () => {
    test("ツール名と説明が設定されている", () => {
      expect(webFetchTool.name).toBe("web_fetch");
      expect(webFetchTool.description).toBeDefined();
      expect(webFetchTool.description.length).toBeGreaterThan(0);
    });

    test("スキーマが定義されている", () => {
      expect(webFetchTool.schema).toBeDefined();
    });

    test("無効なURLでエラーを返す", async () => {
      const result = await webFetchTool._call({ url: "not-a-valid-url" });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty("error");
    });

    test("キャッシュが動作する", async () => {
      // 同じURLで2回呼び出す
      const result1 = await webFetchTool._call({ url: "https://example.com" });
      const parsed1 = JSON.parse(result1);

      // 2回目はキャッシュから返される
      const result2 = await webFetchTool._call({ url: "https://example.com" });
      const parsed2 = JSON.parse(result2);

      // 内容が同じであることを確認
      expect(parsed1.content).toBe(parsed2.content);
    });
  });
});
