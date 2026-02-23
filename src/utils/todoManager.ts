/**
 * TODO管理ユーティリティ
 *
 * ワークフローの進捗を可視化するためのTODO管理機能を提供します。
 */

import type { TodoItem, TodoStatus } from "@/state.js";
import { logger } from "@/logger.js";

/**
 * デフォルトのタスク定義
 */
const DEFAULT_TASKS: Omit<TodoItem, "status" | "startedAt" | "completedAt" | "attemptCount">[] = [
  { id: "researcher", name: "リサーチ" },
  { id: "planner", name: "構成策划" },
  { id: "writer", name: "執筆" },
  { id: "editor", name: "編集" },
  { id: "reviewer", name: "レビュー" },
];

/**
 * 初期TODOリストを作成する
 *
 * @param skipResearch - リサーチをスキップするかどうか
 * @returns 初期化されたTODOリスト
 */
export function createInitialTodos(skipResearch: boolean): TodoItem[] {
  return DEFAULT_TASKS.map((task) => ({
    ...task,
    status: skipResearch && task.id === "researcher" ? "skipped" : "pending",
    attemptCount: 0,
  }));
}

/**
 * TODOの状態を更新する
 *
 * @param todos - 現在のTODOリスト
 * @param taskId - 更新対象のタスクID
 * @param status - 新しい状態
 * @returns 更新されたTODOリスト
 */
export function updateTodoStatus(
  todos: TodoItem[],
  taskId: string,
  status: TodoStatus,
): TodoItem[] {
  const now = new Date().toISOString();

  return todos.map((todo) => {
    if (todo.id !== taskId) {
      return todo;
    }

    const updatedTodo: TodoItem = {
      ...todo,
      status,
    };

    // 状態に応じてタイムスタンプとカウントを更新
    if (status === "in_progress") {
      updatedTodo.startedAt = now;
      updatedTodo.attemptCount = todo.attemptCount + 1;
    } else if (status === "completed") {
      updatedTodo.completedAt = now;
    }

    return updatedTodo;
  });
}

/**
 * 保留中のTODOを取得する
 *
 * @param todos - TODOリスト
 * @returns 保留中のTODOの配列
 */
export function getPendingTodos(todos: TodoItem[]): TodoItem[] {
  return todos.filter((todo) => todo.status === "pending");
}

/**
 * 現在進行中のTODOを取得する
 *
 * @param todos - TODOリスト
 * @returns 進行中のTODO、または undefined
 */
export function getCurrentTodo(todos: TodoItem[]): TodoItem | undefined {
  return todos.find((todo) => todo.status === "in_progress");
}

/**
 * 進捗サマリーを取得する
 *
 * @param todos - TODOリスト
 * @returns 進捗情報
 */
export function getProgressSummary(todos: TodoItem[]): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  skipped: number;
  percentage: number;
} {
  const total = todos.length;
  const completed = todos.filter((t) => t.status === "completed").length;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const pending = todos.filter((t) => t.status === "pending").length;
  const skipped = todos.filter((t) => t.status === "skipped").length;

  // スキップされたタスクは完了扱いで計算
  const effectiveCompleted = completed + skipped;
  const percentage = total > 0 ? Math.round((effectiveCompleted / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    skipped,
    percentage,
  };
}

/**
 * TODOリストをログ出力用にフォーマットする
 *
 * @param todos - TODOリスト
 * @returns フォーマットされた文字列
 */
export function formatTodoList(todos: TodoItem[]): string {
  const statusEmoji: Record<TodoStatus, string> = {
    pending: "⬜",
    in_progress: "🔄",
    completed: "✅",
    skipped: "⏭️",
  };

  const lines = todos.map((todo) => {
    const emoji = statusEmoji[todo.status];
    const attemptInfo = todo.attemptCount > 0 ? ` (${todo.attemptCount}回目)` : "";
    return `  ${emoji} ${todo.name}${attemptInfo}`;
  });

  return lines.join("\n");
}

/**
 * 進捗ログを出力する
 *
 * @param todos - TODOリスト
 * @param currentAction - 現在のアクション説明
 */
export function logProgress(todos: TodoItem[], currentAction: string): void {
  const summary = getProgressSummary(todos);
  const currentTodo = getCurrentTodo(todos);
  const currentIndex = currentTodo ? todos.findIndex((t) => t.id === currentTodo.id) + 1 : 0;

  // 進捗サマリー
  logger.info(`\n📋 タスク進捗: ${summary.completed + summary.skipped}/${summary.total} 完了 (${summary.percentage}%)`);

  // 現在のアクション
  if (currentTodo) {
    logger.info(`📍 (${currentIndex}/${summary.total}) ${currentAction}`);
  }

  // 詳細なタスク一覧（デバッグレベル）
  logger.debug("タスク一覧:\n" + formatTodoList(todos));
}
