/**
 * agentFactory.ts のテスト
 *
 * parseRetryResponse(), createStandardAgent(), createReviewerAgent() のテスト
 */

import { describe, test, expect } from "bun:test";
import { parseRetryResponse } from "../../src/agents/agentFactory.js";
import { sampleResponses } from "../mocks/fixtures.js";

describe("parseRetryResponse", () => {
  describe("RETRY判定", () => {
    test("文末のRETRYを検出", () => {
      const result = parseRetryResponse("応答内容\nRETRY");
      expect(result.needRetry).toBe(true);
      expect(result.content).toBe("応答内容");
    });

    test("大文字小文字を区別しない", () => {
      const testCases = [
        "応答\nRETRY",
        "応答\nretry",
        "応答\nRetry",
        "応答\nReTry",
      ];

      for (const input of testCases) {
        const result = parseRetryResponse(input);
        expect(result.needRetry).toBe(true);
      }
    });

    test("周辺の空白を許容", () => {
      const testCases = [
        "応答\n RETRY",
        "応答\nRETRY ",
        "応答\n retry  ",
        "応答\n  retry",
      ];

      for (const input of testCases) {
        const result = parseRetryResponse(input);
        expect(result.needRetry).toBe(true);
      }
    });

    test("文中のRETRYは検出しない", () => {
      const result = parseRetryResponse("RETRYが必要な応答です");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("RETRYが必要な応答です");
    });

    test("行の途中のRETRYは検出しない", () => {
      const result = parseRetryResponse("応答内容\nRETRYです\n続きます");
      expect(result.needRetry).toBe(false);
    });
  });

  describe("PROCEED判定", () => {
    test("RETRYでなければPROCEED", () => {
      const result = parseRetryResponse("応答内容\nPROCEED");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("応答内容");
    });

    test("フラグなしはPROCEED", () => {
      const result = parseRetryResponse("単純な応答内容");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("単純な応答内容");
    });

    test("PROCEEDをコンテンツから削除", () => {
      const result = parseRetryResponse("応答内容\nPROCEED");
      expect(result.content).toBe("応答内容");
    });

    test("大文字小文字混合のPROCEEDを削除", () => {
      const result = parseRetryResponse("応答内容\nProceed");
      expect(result.content).toBe("応答内容");
    });
  });

  describe("コンテンツのクリーニング", () => {
    test("PROCEEDを削除してtrim", () => {
      const result = parseRetryResponse("  応答内容  \nPROCEED  ");
      expect(result.content).toBe("応答内容");
    });

    test("RETRYを削除してtrim", () => {
      const result = parseRetryResponse("  応答内容  \nRETRY  ");
      expect(result.content).toBe("応答内容");
    });

    test("複数の改行を維持", () => {
      const result = parseRetryResponse("応答内容\n\n\nPROCEED");
      // trim()が最後に呼ばれるので、末尾の改行は削除される
      expect(result.content).toBe("応答内容");
    });

    test("前後の空白のみを削除", () => {
      const result = parseRetryResponse("  応答内容  ");
      expect(result.content).toBe("応答内容");
    });

    test("空の応答を処理", () => {
      const result = parseRetryResponse("  \nPROCEED  ");
      expect(result.content).toBe("");
    });
  });

  describe("エッジケース", () => {
    test("RETRYのみの応答", () => {
      const result = parseRetryResponse("RETRY");
      expect(result.needRetry).toBe(true);
      expect(result.content).toBe("");
    });

    test("PROCEEDのみの応答", () => {
      const result = parseRetryResponse("PROCEED");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("");
    });

    test("空文字列", () => {
      const result = parseRetryResponse("");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("");
    });

    test("空白のみ", () => {
      const result = parseRetryResponse("   \n  ");
      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("");
    });

    test("複数のフラグ（最後のみ有効）", () => {
      const result = parseRetryResponse("応答\nPROCEED\nRETRY");
      expect(result.needRetry).toBe(true);
      expect(result.content).toBe("応答\nPROCEED");
    });
  });

  describe("実際の応答パターン", () => {
    test("研究員応答：PROCEED", () => {
      const response = "調査結果：LangChainはJS向けのLLMフレームワークです。\nPROCEED";
      const result = parseRetryResponse(response);

      expect(result.needRetry).toBe(false);
      expect(result.content).toBe("調査結果：LangChainはJS向けのLLMフレームワークです。");
    });

    test("研究員応答：RETRY", () => {
      const response = "調査が不十分です。追加調査が必要です。\nRETRY";
      const result = parseRetryResponse(response);

      expect(result.needRetry).toBe(true);
      expect(result.content).toBe("調査が不十分です。追加調査が必要です。");
    });

    test("ライター応答：長いテキスト", () => {
      const response = `
# 記事タイトル

## はじめに
これは本文です。

## 結論
結論です。
PROCEED
      `.trim();

      const result = parseRetryResponse(response);
      expect(result.needRetry).toBe(false);
      expect(result.content).toContain("# 記事タイトル");
      expect(result.content).not.toContain("PROCEED");
    });
  });
});

// TODO: createStandardAgent のテスト（モックモデルを使用）
// TODO: createReviewerAgent のテスト（モックモデルを使用）
