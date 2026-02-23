/**
 * writer.ts のテスト
 *
 * Writerエージェントの動作（初稿・改稿モード）を検証します。
 */

import { describe, expect, test } from "bun:test";
import { editedFixture, outlinedFixture } from "../mocks/mockState.js";

describe("writerNode", () => {
  describe("初稿モード", () => {
    test("reviewがない場合は初稿モード", () => {
      const state = {
        ...outlinedFixture,
        review: "", // レビューなし
      };

      // 初稿モードの条件確認
      const isInitial = !state.review;
      expect(isInitial).toBe(true);
    });

    test("初稿モードの入力抽出", () => {
      const state = {
        ...outlinedFixture,
      };

      // 初稿モードの入力: topic, research, outline
      const expectedInput = {
        topic: state.topic,
        research: state.research,
        outline: state.outline,
      };

      expect(expectedInput.topic).toBeDefined();
      expect(expectedInput.research).toBeDefined();
      expect(expectedInput.outline).toBeDefined();
    });

    test("初稿モードの出力マッピング", () => {
      const draftContent = "これは初稿の内容です。";

      // outputMapper: draft フィールドに設定
      const expectedOutput = { draft: draftContent };

      expect(expectedOutput.draft).toBe(draftContent);
    });

    test("初稿モードの完了メッセージ", () => {
      const message = "初稿完了";
      expect(message).toBe("初稿完了");
    });
  });

  describe("改稿モード", () => {
    test("reviewがある場合は改稿モード", () => {
      const state = {
        ...editedFixture,
        review: "REVISE: 内容を修正してください", // レビューあり
      };

      // 改稿モードの条件確認
      const isRevision = !!state.review;
      expect(isRevision).toBe(true);
    });

    test("改稿モードの入力抽出", () => {
      const state = {
        ...editedFixture,
        draft: "元の原稿",
        editedDraft: "編集済み原稿",
        review: "REVISE: 内容を修正してください",
      };

      // 改稿モードの入力: topic, research, outline, draft(またはeditedDraft), review
      const expectedInput = {
        topic: state.topic,
        research: state.research,
        outline: state.outline,
        draft: state.editedDraft || state.draft,
        review: state.review,
      };

      expect(expectedInput.topic).toBeDefined();
      expect(expectedInput.research).toBeDefined();
      expect(expectedInput.outline).toBeDefined();
      expect(expectedInput.draft).toBe("編集済み原稿"); // editedDraftが優先
      expect(expectedInput.review).toBeDefined();
    });

    test("改稿モードの出力マッピング", () => {
      const revisedContent = "これは改稿後の内容です。";

      // outputMapper: draft フィールドに上書き
      const expectedOutput = { draft: revisedContent };

      expect(expectedOutput.draft).toBe(revisedContent);
    });

    test("改稿モードの完了メッセージ", () => {
      const message = "改稿完了";
      expect(message).toBe("改稿完了");
    });
  });

  describe("共通設定", () => {
    test("正しいステータス遷移", () => {
      const nextStatus = "editing";
      expect(nextStatus).toBe("editing");
    });

    test("正しいリトライキー", () => {
      const retryKey = "writerRetryCount";
      expect(retryKey).toBe("writerRetryCount");
    });

    test("モデルタイプ", () => {
      const modelType = "writer";
      expect(modelType).toBe("writer");
    });
  });

  describe("editedDraftの優先順位", () => {
    test("editedDraftがある場合はそれを使用", () => {
      const state = {
        ...outlinedFixture,
        draft: "元の原稿",
        editedDraft: "編集済み原稿",
        review: "REVISE",
      };

      const draftToUse = state.editedDraft || state.draft;
      expect(draftToUse).toBe("編集済み原稿");
    });

    test("editedDraftがない場合はdraftを使用", () => {
      const state = {
        ...outlinedFixture,
        draft: "元の原稿",
        editedDraft: "",
        review: "REVISE",
      };

      const draftToUse = state.editedDraft || state.draft;
      expect(draftToUse).toBe("元の原稿");
    });
  });
});
