import { z } from "zod";

/**
 * タスク追加用スキーマ
 */
export const TodoAddSchema = z.object({
  name: z.string().describe("タスク名"),
  description: z.string().optional().describe("タスクの詳細説明"),
  assignToAgent: z
    .enum(["researcher", "planner", "writer", "editor", "reviewer"])
    .optional()
    .describe("担当するエージェント（省略時は自分が担当）"),
});

export type TodoAddInput = z.infer<typeof TodoAddSchema>;

/**
 * タスク更新用スキーマ
 */
export const TodoUpdateSchema = z.object({
  taskId: z.string().describe("タスクID"),
  status: z
    .enum(["pending", "in_progress", "completed", "skipped"])
    .describe("新しいステータス"),
  note: z.string().optional().describe("メモや補足情報（任意）"),
});

export type TodoUpdateInput = z.infer<typeof TodoUpdateSchema>;

/**
 * タスク一覧取得用スキーマ
 */
export const TodoListSchema = z.object({
  filter: z
    .enum(["all", "mine", "pending", "completed"])
    .optional()
    .describe("フィルター条件（省略時はall）"),
});

export type TodoListInput = z.infer<typeof TodoListSchema>;

/**
 * タスク依頼用スキーマ
 */
export const TodoDelegateSchema = z.object({
  taskName: z.string().describe("依頼するタスク名"),
  description: z.string().describe("タスクの詳細説明"),
  targetAgent: z
    .enum(["researcher", "planner", "writer", "editor", "reviewer"])
    .describe("依頼先エージェント"),
});

export type TodoDelegateInput = z.infer<typeof TodoDelegateSchema>;

/**
 * エージェントロール型
 */
export type AgentRole = "researcher" | "planner" | "writer" | "editor" | "reviewer";
