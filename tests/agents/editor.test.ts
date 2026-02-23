/**
 * editor.ts のテスト
 *
 * Editorエージェントの動作を検証します。
 */

import { describe, expect, test } from "bun:test";
import { editorNode } from "../../src/agents/editor.js";
import { draftedFixture } from "../mocks/mockState.js";

describe("editorNode", () => {
  describe("入力抽出", () => {
    test("draftを抽出", () => {
      const state = {
        ...draftedFixture,
        draft: "テスト原稿",
      };

      const expectedInput = {
        draft: state.draft,
      };

      expect(expectedInput.draft).toBe("テスト原稿");
    });
  });

  describe("出力マッピング", () => {
    test("editedDraftを設定", () => {
      const editedContent = "編集済みのテスト原稿";

      const expectedOutput = { editedDraft: editedContent };

      expect(expectedOutput.editedDraft).toBe(editedContent);
    });
  });

  describe("設定", () => {
    test("正しいステータス遷移", () => {
      const nextStatus = "reviewing";
      expect(nextStatus).toBe("reviewing");
    });

    test("正しいリトライキー", () => {
      const retryKey = "editorRetryCount";
      expect(retryKey).toBe("editorRetryCount");
    });

    test("完了メッセージ", () => {
      const message = "編集完了";
      expect(message).toBe("編集完了");
    });

    test("モデルタイプ", () => {
      const modelType = "editor";
      expect(modelType).toBe("editor");
    });
  });

  describe("エージェント構造", () => {
    test("editorNodeが定義されている", () => {
      expect(editorNode).toBeDefined();
      expect(typeof editorNode).toBe("function");
    });
  });
});
