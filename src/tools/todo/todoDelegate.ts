import { DynamicStructuredTool } from "@langchain/core/tools";
import type { TodoItem } from "../../state.js";
import type { TodoToolContext, AgentRole } from "./index.js";
import { TodoDelegateSchema } from "./types.js";

/**
 * 他エージェントへのタスク依頼ツールを作成
 */
export function createTodoDelegateTool(context: TodoToolContext) {
  return new DynamicStructuredTool({
    name: "todo_delegate",
    description:
      "他のエージェントにタスクを依頼します。新しいタスクが作成され、指定したエージェントが担当者として設定されます。",
    schema: TodoDelegateSchema,
    func: async (input) => {
      const state = context.getState();
      const { taskName, description, targetAgent } = input;

      // ユニークID生成
      const counter = state.todoCounter + 1;
      const taskId = `todo_${counter}`;

      // 新しいタスク作成
      const newTodo: TodoItem = {
        id: taskId,
        name: taskName,
        status: "pending",
        attemptCount: 0,
        description,
        assignedAgent: targetAgent as AgentRole,
        createdBy: context.currentAgent,
        notes: [],
      };

      // ステート更新
      context.updateState({
        todos: [...state.todos, newTodo],
        todoCounter: counter,
      });

      return JSON.stringify({
        success: true,
        taskId,
        delegatedTo: targetAgent,
        message: `${context.currentAgent}から${targetAgent}にタスク「${taskName}」を依頼しました`,
        description,
      });
    },
  });
}
