import { DynamicStructuredTool } from "@langchain/core/tools";
import type { TodoItem } from "../../state.js";
import type { TodoToolContext, AgentRole } from "./index.js";
import { TodoAddSchema } from "./types.js";

/**
 * タスク追加ツールを作成
 */
export function createTodoAddTool(context: TodoToolContext) {
  return new DynamicStructuredTool({
    name: "todo_add",
    description: "新しいタスクをTODOリストに追加します。自分用のタスクや他エージェントへの依頼タスクを作成できます。",
    schema: TodoAddSchema,
    func: async (input) => {
      const state = context.getState();
      const { name, description, assignToAgent } = input;

      // ユニークID生成
      const counter = state.todoCounter + 1;
      const taskId = `todo_${counter}`;

      // 担当エージェント（省略時は自分）
      const assignedAgent: AgentRole = assignToAgent ?? context.currentAgent;

      // 新しいタスク作成
      const newTodo: TodoItem = {
        id: taskId,
        name,
        status: "pending",
        attemptCount: 0,
        description,
        assignedAgent: assignedAgent,
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
        message: `タスク「${name}」を追加しました（担当: ${assignedAgent}）`,
      });
    },
  });
}
