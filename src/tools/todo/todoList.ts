import { DynamicStructuredTool } from "@langchain/core/tools";
import type { TodoItem } from "../../state.js";
import type { TodoToolContext } from "./index.js";
import { TodoListSchema } from "./types.js";

/**
 * タスク一覧取得ツールを作成
 */
export function createTodoListTool(context: TodoToolContext) {
  return new DynamicStructuredTool({
    name: "todo_list",
    description: "TODOリストを取得します。フィルターで自分のタスクや未完了タスクなどを絞り込めます。",
    schema: TodoListSchema,
    func: async (input) => {
      const state = context.getState();
      const filter = input.filter ?? "all";

      // フィルタリング
      let filteredTodos: TodoItem[];
      switch (filter) {
        case "mine":
          filteredTodos = state.todos.filter(
            (t) => t.assignedAgent === context.currentAgent || t.createdBy === context.currentAgent
          );
          break;
        case "pending":
          filteredTodos = state.todos.filter((t) => t.status === "pending");
          break;
        case "completed":
          filteredTodos = state.todos.filter((t) => t.status === "completed");
          break;
        case "all":
        default:
          filteredTodos = state.todos;
      }

      // サマリー情報
      const summary = {
        total: state.todos.length,
        pending: state.todos.filter((t) => t.status === "pending").length,
        inProgress: state.todos.filter((t) => t.status === "in_progress").length,
        completed: state.todos.filter((t) => t.status === "completed").length,
        skipped: state.todos.filter((t) => t.status === "skipped").length,
      };

      // 表示用に簡潔な形式に変換
      const todoList = filteredTodos.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        assignedAgent: t.assignedAgent,
        description: t.description,
      }));

      return JSON.stringify({
        success: true,
        filter,
        summary,
        count: todoList.length,
        todos: todoList,
      });
    },
  });
}
