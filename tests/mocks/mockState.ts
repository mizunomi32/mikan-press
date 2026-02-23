/**
 * テスト用 ArticleState フィクスチャ
 *
 * テストで使用する様々な状態のモックを提供します。
 */

import type { ArticleState } from "../../src/state.js";

/**
 * 基本的な初期状態（トピックのみ）
 */
export const initialFixture: Partial<ArticleState> = {
  topic: "テストトピック",
  research: "",
  outline: "",
  draft: "",
  editedDraft: "",
  review: "",
  finalArticle: "",
  reviewCount: 0,
  maxReviews: 3,
  skipResearch: false,
  status: "researching",
  needRetry: false,
  maxRetriesPerAgent: 1,
  researcherRetryCount: 0,
  plannerRetryCount: 0,
  writerRetryCount: 0,
  editorRetryCount: 0,
};

/**
 * リサーチ完了後の状態
 */
export const researchedFixture: Partial<ArticleState> = {
  ...initialFixture,
  research: "リサーチ結果のサンプルテキスト",
  status: "planning",
};

/**
 * アウトライン完了後の状態
 */
export const outlinedFixture: Partial<ArticleState> = {
  ...researchedFixture,
  outline: "アウトラインのサンプルテキスト",
  status: "writing",
};

/**
 * 原稿完了後の状態
 */
export const draftedFixture: Partial<ArticleState> = {
  ...outlinedFixture,
  draft: "原稿のサンプルテキスト",
  status: "editing",
};

/**
 * 編集完了後の状態
 */
export const editedFixture: Partial<ArticleState> = {
  ...draftedFixture,
  editedDraft: "編集済み原稿のサンプルテキスト",
  status: "reviewing",
};

/**
 * 研究スキップ時の状態
 */
export const skipResearchFixture: Partial<ArticleState> = {
  ...initialFixture,
  skipResearch: true,
};

/**
 * リトライが必要な状態（Researcher用）
 */
export const researcherRetryFixture: Partial<ArticleState> = {
  ...initialFixture,
  needRetry: true,
  researcherRetryCount: 0,
  maxRetriesPerAgent: 1,
};

/**
 * リトライ上限に達した状態（Researcher用）
 */
export const researcherRetryLimitFixture: Partial<ArticleState> = {
  ...initialFixture,
  needRetry: true,
  researcherRetryCount: 1,
  maxRetriesPerAgent: 1,
};

/**
 * レビュー差し戻し状態（Writerへ戻る）
 */
export const reviewReviseFixture: Partial<ArticleState> = {
  ...editedFixture,
  review: "REVISE: 内容を修正してください",
  reviewCount: 1,
  status: "writing",
};

/**
 * レビュー完了状態
 */
export const reviewApprovedFixture: Partial<ArticleState> = {
  ...editedFixture,
  review: "APPROVE: 良い出来です",
  reviewCount: 1,
  finalArticle: "編集済み原稿のサンプルテキスト",
  status: "done",
};
