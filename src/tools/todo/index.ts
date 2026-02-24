import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ArticleState } from "../../state.js";
import type { AgentRole } from "./types.js";
import { createTodoAddTool } from "./todoAdd.js";
import { createTodoUpdateTool } from "./todoUpdate.js";
import { createTodoListTool } from "./todoList.js";
import { createTodoDelegateTool } from "./todoDelegate.js";

/**
 * TODOツールがアクセスするコンテキスト
 */
export interface TodoToolContext {
  /** 現在のステートを取得 */
  getState: () => typeof ArticleState.State;
  /** ステートを部分的に更新 */
  updateState: (updates: Partial<typeof ArticleState.State>) => void;
  /** 現在実行中のエージェント名 */
  currentAgent: AgentRole;
}

/**
 * TODO管理ツールを作成するファクトリー関数
 */
export function createTodoTools(context: TodoToolContext): StructuredToolInterface[] {
  return [
    createTodoAddTool(context),
    createTodoUpdateTool(context),
    createTodoListTool(context),
    createTodoDelegateTool(context),
  ];
}

// 再エクスポート
export { createTodoAddTool } from "./todoAdd.js";
export { createTodoUpdateTool } from "./todoUpdate.js";
export { createTodoListTool } from "./todoList.js";
export { createTodoDelegateTool } from "./todoDelegate.js";
export type { TodoAddInput, TodoUpdateInput, TodoListInput, TodoDelegateInput, AgentRole } from "./types.js";
