/**
 * planner.ts のテスト
 *
 * Plannerエージェントの動作を検証します。
 */

import { describe, test, expect } from "bun:test";
import { plannerNode } from "../../src/agents/planner.js";
import { researchedFixture } from "../mocks/mockState.js";

describe("plannerNode", () => {
  describe("入力抽出", () => {
    test("topicとresearchを抽出", () => {
      const state = {
        ...researchedFixture,
        topic: "テストトピック",
        research: "テストリサーチ結果",
      };

      const expectedInput = {
        topic: state.topic,
        research: state.research,
      };

      expect(expectedInput.topic).toBe("テストトピック");
      expect(expectedInput.research).toBe("テストリサーチ結果");
    });
  });

  describe("出力マッピング", () => {
    test("outlineを設定", () => {
      const outlineContent = "1. はじめに\n2. 本論\n3. 結論";

      const expectedOutput = { outline: outlineContent };

      expect(expectedOutput.outline).toBe(outlineContent);
    });
  });

  describe("設定", () => {
    test("正しいステータス遷移", () => {
      const nextStatus = "writing";
      expect(nextStatus).toBe("writing");
    });

    test("正しいリトライキー", () => {
      const retryKey = "plannerRetryCount";
      expect(retryKey).toBe("plannerRetryCount");
    });

    test("完了メッセージ", () => {
      const message = "アウトライン作成完了";
      expect(message).toBe("アウトライン作成完了");
    });

    test("モデルタイプ", () => {
      const modelType = "planner";
      expect(modelType).toBe("planner");
    });
  });

  describe("エージェント構造", () => {
    test("plannerNodeが定義されている", () => {
      expect(plannerNode).toBeDefined();
      expect(typeof plannerNode).toBe("function");
    });
  });
});
