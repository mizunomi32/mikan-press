import { DynamicStructuredTool } from "@langchain/core/tools";
import type { TodoItem, TodoStatus } from "../../state.js";
import type { TodoToolContext } from "./index.js";
import { TodoUpdateSchema } from "./types.js";

/**
 * タスク更新ツールを作成
 */
export function createTodoUpdateTool(context: TodoToolContext) {
  return new DynamicStructuredTool({
    name: "todo_update",
    description:
      "タスクのステータスを更新します。作業開始時にin_progress、完了時にcompletedに設定してください。メモを追加することもできます。",
    schema: TodoUpdateSchema,
    func: async (input) => {
      const state = context.getState();
      const { taskId, status, note } = input;

      // タスクを検索
      const todoIndex = state.todos.findIndex((t) => t.id === taskId);
      if (todoIndex === -1) {
        return JSON.stringify({
          success: false,
          error: `タスクID「${taskId}」が見つかりません`,
        });
      }

      const todo = state.todos[todoIndex];
      if (!todo) {
        return JSON.stringify({
          success: false,
          error: `タスクID「${taskId}」のデータが見つかりません`,
        });
      }

      const now = new Date().toISOString();

      // 更新内容を構築
      const updates: Partial<TodoItem> = {
        status: status as TodoStatus,
      };

      // ステータスに応じたタイムスタンプ更新
      if (status === "in_progress" && !todo.startedAt) {
        updates.startedAt = now;
      }
      if (status === "completed") {
        updates.completedAt = now;
      }

      // メモ追加
      if (note) {
        const notes = todo.notes ?? [];
        updates.notes = [...notes, `[${context.currentAgent}] ${note}`];
      }

      // 試行回数をインクリメント（in_progressに変更時）
      if (status === "in_progress" && todo.status !== "in_progress") {
        updates.attemptCount = todo.attemptCount + 1;
      }

      // todos配列を更新
      const newTodos = [...state.todos];
      newTodos[todoIndex] = { ...todo, ...updates };

      context.updateState({ todos: newTodos });

      return JSON.stringify({
        success: true,
        taskId,
        previousStatus: todo.status,
        newStatus: status,
        message: `タスク「${todo.name}」を${status}に更新しました`,
      });
    },
  });
}
