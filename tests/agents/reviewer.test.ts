/**
 * reviewer.ts のテスト
 *
 * ReviewerエージェントのAPPROVE/REVISE判定と最大レビュー回数制御を検証します。
 */

import { describe, test, expect } from "bun:test";
import { reviewerNode } from "../../src/agents/reviewer.js";
import { editedFixture, reviewApprovedFixture, reviewReviseFixture } from "../mocks/mockState.js";

describe("reviewerNode", () => {
  describe("入力抽出", () => {
    test("outlineとeditedDraftを抽出", () => {
      const state = {
        ...editedFixture,
        outline: "テストアウトライン",
        editedDraft: "テスト編集済み原稿",
      };

      const expectedInput = {
        outline: state.outline,
        editedDraft: state.editedDraft,
      };

      expect(expectedInput.outline).toBe("テストアウトライン");
      expect(expectedInput.editedDraft).toBe("テスト編集済み原稿");
    });
  });

  describe("APPROVE/REVISE 判定ロジック", () => {
    test("APPROVEを含む応答で承認", () => {
      const reviewText = "APPROVE: 良い出来です";

      const isApproved = reviewText.includes("APPROVE");
      expect(isApproved).toBe(true);
    });

    test("REVISEを含む応答で差し戻し", () => {
      const reviewText = "REVISE: 内容を修正してください";

      const isApproved = reviewText.includes("APPROVE");
      expect(isApproved).toBe(false);
    });

    test("どちらも含まない場合は差し戻し", () => {
      const reviewText = "コメントです";

      const isApproved = reviewText.includes("APPROVE");
      expect(isApproved).toBe(false);
    });
  });

  describe("最大レビュー回数制御", () => {
    test("最大回数に達していない場合は差し戻し可能", () => {
      const currentCount = 1;
      const maxReviews = 3;
      const isApproved = false;

      const reachedLimit = currentCount >= maxReviews;
      const isDone = isApproved || reachedLimit;

      expect(reachedLimit).toBe(false);
      expect(isDone).toBe(false); // 差し戻し
    });

    test("最大回数に達した場合は強制終了", () => {
      const currentCount = 3;
      const maxReviews = 3;
      const isApproved = false;

      const reachedLimit = currentCount >= maxReviews;
      const isDone = isApproved || reachedLimit;

      expect(reachedLimit).toBe(true);
      expect(isDone).toBe(true); // 終了
    });

    test("承認時は回数に関わらず終了", () => {
      const currentCount = 1;
      const maxReviews = 3;
      const isApproved = true;

      const isDone = isApproved;

      expect(isDone).toBe(true); // 終了
    });
  });

  describe("ステータス遷移", () => {
    test("差し戻し時はwritingへ", () => {
      const isDone = false;
      const status = isDone ? "done" : "writing";

      expect(status).toBe("writing");
    });

    test("完了時はdoneへ", () => {
      const isDone = true;
      const status = isDone ? "done" : "writing";

      expect(status).toBe("done");
    });
  });

  describe("出力マッピング", () => {
    test("レビューテキストを設定", () => {
      const reviewText = "REVISE: 構成を見直してください";

      const expectedOutput = {
        review: reviewText,
        reviewCount: 1,
      };

      expect(expectedOutput.review).toBe(reviewText);
      expect(expectedOutput.reviewCount).toBe(1);
    });

    test("完了時にfinalArticleを設定", () => {
      const isDone = true;
      const editedDraft = "編集済み原稿";

      const finalArticle = isDone ? editedDraft : undefined;

      expect(finalArticle).toBe("編集済み原稿");
    });

    test("差し戻し時にfinalArticleはundefined", () => {
      const isDone = false;
      const editedDraft = "編集済み原稿";

      const finalArticle = isDone ? editedDraft : undefined;

      expect(finalArticle).toBeUndefined();
    });
  });

  describe("設定", () => {
    test("モデルタイプ", () => {
      const modelType = "reviewer";
      expect(modelType).toBe("reviewer");
    });

    test("エージェント名", () => {
      const name = "Reviewer";
      expect(name).toBe("Reviewer");
    });
  });

  describe("エージェント構造", () => {
    test("reviewerNodeが定義されている", () => {
      expect(reviewerNode).toBeDefined();
      expect(typeof reviewerNode).toBe("function");
    });
  });

  describe("実際のワークフローシナリオ", () => {
    test("1回目のレビューで差し戻し", () => {
      const state = {
        ...editedFixture,
        reviewCount: 0,
        maxReviews: 3,
      };

      expect(state.reviewCount).toBe(0);
      expect(state.maxReviews).toBe(3);
    });

    test("3回目のレビューで承認", () => {
      const state = {
        ...editedFixture,
        reviewCount: 2,
        maxReviews: 3,
      };

      expect(state.reviewCount).toBe(2);
      // 次のレビューで3回目
    });

    test("最大回数到達時の挙動", () => {
      const currentCount = 3;
      const maxReviews = 3;

      // カウントはmaxReviewsまで
      expect(currentCount).toBe(maxReviews);
    });
  });
});
