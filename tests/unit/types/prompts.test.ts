/**
 * prompts.ts のテスト
 *
 * validatePromptInput() と各スキーマのバリデーションをテスト
 */

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  editorInputSchema,
  plannerInputSchema,
  researcherInputSchema,
  reviewerInputSchema,
  textContentSchema,
  topicSchema,
  validatePromptInput,
  writerInputSchema,
  writerRevisionInputSchema,
} from "../../../src/types/prompts.js";

describe("topicSchema", () => {
  test("有効なトピックを受け入れる", () => {
    const result = topicSchema.parse("量子コンピュータの基礎");
    expect(result).toBe("量子コンピュータの基礎");
  });

  test("空文字でエラー", () => {
    expect(() => topicSchema.parse("")).toThrow();
  });

  test("500文字超過でエラー", () => {
    const longTopic = "a".repeat(501);
    expect(() => topicSchema.parse(longTopic)).toThrow();
  });

  test("500文字は許可される", () => {
    const maxTopic = "a".repeat(500);
    const result = topicSchema.parse(maxTopic);
    expect(result).toBe(maxTopic);
  });
});

describe("textContentSchema", () => {
  test("有効なコンテンツを受け入れる", () => {
    const result = textContentSchema.parse("これは有効なコンテンツです。");
    expect(result).toBe("これは有効なコンテンツです。");
  });

  test("空文字でエラー", () => {
    expect(() => textContentSchema.parse("")).toThrow();
  });

  test("100,000文字超過でエラー", () => {
    const longContent = "a".repeat(100_001);
    expect(() => textContentSchema.parse(longContent)).toThrow();
  });

  test("100,000文字は許可される", () => {
    const maxContent = "a".repeat(100_000);
    const result = textContentSchema.parse(maxContent);
    expect(result).toBe(maxContent);
  });
});

describe("validatePromptInput", () => {
  describe("ResearcherInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(researcherInputSchema, { topic: "テスト" }, "Researcher");
      expect(result.topic).toBe("テスト");
    });

    test("空のトピックでエラー", () => {
      expect(() => validatePromptInput(researcherInputSchema, { topic: "" }, "Researcher")).toThrow(
        /\[Researcher\] プロンプト入力のバリデーションエラー/,
      );
    });

    test("topicがない場合エラー", () => {
      expect(() => validatePromptInput(researcherInputSchema, {}, "Researcher")).toThrow(
        /\[Researcher\] プロンプト入力のバリデーションエラー/,
      );
    });
  });

  describe("PlannerInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(
        plannerInputSchema,
        { topic: "テスト", research: "リサーチ結果" },
        "Planner",
      );
      expect(result.topic).toBe("テスト");
      expect(result.research).toBe("リサーチ結果");
    });

    test("researchがない場合エラー", () => {
      expect(() => validatePromptInput(plannerInputSchema, { topic: "テスト" }, "Planner")).toThrow(
        /\[Planner\] プロンプト入力のバリデーションエラー/,
      );
    });
  });

  describe("WriterInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(
        writerInputSchema,
        { topic: "テスト", research: "リサーチ", outline: "アウトライン" },
        "Writer",
      );
      expect(result.topic).toBe("テスト");
      expect(result.research).toBe("リサーチ");
      expect(result.outline).toBe("アウトライン");
    });

    test("outlineがない場合エラー", () => {
      expect(() =>
        validatePromptInput(writerInputSchema, { topic: "テスト", research: "リサーチ" }, "Writer"),
      ).toThrow(/\[Writer\] プロンプト入力のバリデーションエラー/);
    });
  });

  describe("WriterRevisionInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(
        writerRevisionInputSchema,
        { topic: "テスト", research: "リサーチ", outline: "アウトライン", draft: "原稿", review: "レビュー" },
        "Writer",
      );
      expect(result.topic).toBe("テスト");
      expect(result.draft).toBe("原稿");
      expect(result.review).toBe("レビュー");
    });

    test("reviewがない場合エラー", () => {
      expect(() =>
        validatePromptInput(
          writerRevisionInputSchema,
          { topic: "テスト", research: "リサーチ", outline: "アウトライン", draft: "原稿" },
          "Writer",
        ),
      ).toThrow(/\[Writer\] プロンプト入力のバリデーションエラー/);
    });
  });

  describe("EditorInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(editorInputSchema, { draft: "原稿" }, "Editor");
      expect(result.draft).toBe("原稿");
    });

    test("draftがない場合エラー", () => {
      expect(() => validatePromptInput(editorInputSchema, {}, "Editor")).toThrow(
        /\[Editor\] プロンプト入力のバリデーションエラー/,
      );
    });
  });

  describe("ReviewerInput", () => {
    test("有効な入力を受け入れる", () => {
      const result = validatePromptInput(
        reviewerInputSchema,
        { topic: "テスト", outline: "アウトライン", draft: "原稿", editedDraft: "編集済み" },
        "Reviewer",
      );
      expect(result.topic).toBe("テスト");
      expect(result.reviewCount).toBe(0);
      expect(result.maxReviews).toBe(3);
    });

    test("reviewCountとmaxReviewsのデフォルト値", () => {
      const result = validatePromptInput(
        reviewerInputSchema,
        { topic: "テスト", outline: "アウトライン", draft: "原稿", editedDraft: "編集済み" },
        "Reviewer",
      );
      expect(result.reviewCount).toBe(0);
      expect(result.maxReviews).toBe(3);
    });

    test("reviewCountとmaxReviewsを指定可能", () => {
      const result = validatePromptInput(
        reviewerInputSchema,
        { topic: "テスト", outline: "アウトライン", draft: "原稿", editedDraft: "編集済み", reviewCount: 2, maxReviews: 5 },
        "Reviewer",
      );
      expect(result.reviewCount).toBe(2);
      expect(result.maxReviews).toBe(5);
    });
  });

  describe("エラーメッセージの形式", () => {
    test("複数のエラーがある場合、全て表示される", () => {
      try {
        validatePromptInput(plannerInputSchema, {}, "Planner");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain("[Planner]");
        expect(message).toContain("プロンプト入力のバリデーションエラー");
      }
    });
  });
});
