/**
 * プロンプト入力のZodスキーマ定義
 *
 * 各エージェントのプロンプト入力に対する型安全なバリデーションを提供します。
 */

import { z } from "zod";

// ============================================================================
// 共通スキーマ
// ============================================================================

/**
 * トピックの基本スキーマ
 */
export const topicSchema = z
  .string()
  .min(1, "トピックは必須です")
  .max(500, "トピックは500文字以内で入力してください");

/**
 * テキストコンテンツの基本スキーマ
 */
export const textContentSchema = z
  .string()
  .min(1, "コンテンツは必須です")
  .max(100_000, "コンテンツは100,000文字以内で入力してください");

// ============================================================================
// Researcher エージェント
// ============================================================================

/**
 * Researcher エージェントの入力スキーマ
 */
export const researcherInputSchema = z.object({
  topic: topicSchema,
});

export type ResearcherInput = z.infer<typeof researcherInputSchema>;

// ============================================================================
// Planner エージェント
// ============================================================================

/**
 * Planner エージェントの入力スキーマ
 */
export const plannerInputSchema = z.object({
  topic: topicSchema,
  research: textContentSchema,
});

export type PlannerInput = z.infer<typeof plannerInputSchema>;

// ============================================================================
// Writer エージェント
// ============================================================================

/**
 * Writer エージェント（初回）の入力スキーマ
 */
export const writerInputSchema = z.object({
  topic: topicSchema,
  outline: textContentSchema,
});

export type WriterInput = z.infer<typeof writerInputSchema>;

/**
 * Writer エージェント（改稿）の入力スキーマ
 */
export const writerRevisionInputSchema = z.object({
  topic: topicSchema,
  outline: textContentSchema,
  draft: textContentSchema,
  review: textContentSchema,
});

export type WriterRevisionInput = z.infer<typeof writerRevisionInputSchema>;

// ============================================================================
// Editor エージェント
// ============================================================================

/**
 * Editor エージェントの入力スキーマ
 */
export const editorInputSchema = z.object({
  draft: textContentSchema,
});

export type EditorInput = z.infer<typeof editorInputSchema>;

// ============================================================================
// Reviewer エージェント
// ============================================================================

/**
 * Reviewer エージェントの入力スキーマ
 */
export const reviewerInputSchema = z.object({
  topic: topicSchema,
  outline: textContentSchema,
  draft: textContentSchema,
  editedDraft: textContentSchema,
  reviewCount: z.number().int().min(0).default(0),
  maxReviews: z.number().int().min(1).default(3),
});

export type ReviewerInput = z.infer<typeof reviewerInputSchema>;

// ============================================================================
// バリデーション関数
// ============================================================================

/**
 * プロンプト入力のバリデーションを実行
 *
 * @param schema - Zodスキーマ
 * @param data - バリデーション対象のデータ
 * @param agentName - エージェント名（エラーメッセージ用）
 * @returns バリデーション済みのデータ
 * @throws バリデーションエラー時に例外をスロー
 */
export function validatePromptInput<T extends z.ZodType>(
  schema: T,
  data: unknown,
  agentName: string,
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
      throw new Error(`[${agentName}] プロンプト入力のバリデーションエラー:\n${messages}`);
    }
    throw error;
  }
}
