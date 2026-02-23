/**
 * TODO管理ユーティリティのテスト
 */

import { describe, expect, test } from "bun:test";
import {
  createInitialTodos,
  formatTodoList,
  getCurrentTodo,
  getPendingTodos,
  getProgressSummary,
  updateTodoStatus,
} from "@/utils/todoManager.js";
import type { TodoItem } from "@/state.js";

describe("todoManager", () => {
  describe("createInitialTodos", () => {
    test("デフォルトのタスクリストを作成する", () => {
      const todos = createInitialTodos(false);

      expect(todos).toHaveLength(5);
      expect(todos[0]).toEqual({
        id: "researcher",
        name: "リサーチ",
        status: "pending",
        attemptCount: 0,
      });
      expect(todos[1].id).toBe("planner");
      expect(todos[2].id).toBe("writer");
      expect(todos[3].id).toBe("editor");
      expect(todos[4].id).toBe("reviewer");
    });

    test("skipResearch=trueの場合、researcherがスキップ状態になる", () => {
      const todos = createInitialTodos(true);

      expect(todos[0].status).toBe("skipped");
      expect(todos[1].status).toBe("pending");
    });

    test("skipResearch=falseの場合、すべてのタスクがpending状態", () => {
      const todos = createInitialTodos(false);

      const allPending = todos.every((t) => t.status === "pending");
      expect(allPending).toBe(true);
    });
  });

  describe("updateTodoStatus", () => {
    test("タスクの状態をin_progressに更新する", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "planner", "in_progress");

      const planner = updated.find((t) => t.id === "planner");
      expect(planner?.status).toBe("in_progress");
      expect(planner?.startedAt).toBeDefined();
      expect(planner?.attemptCount).toBe(1);
    });

    test("タスクの状態をcompletedに更新する", () => {
      const todos = createInitialTodos(false);
      const inProgress = updateTodoStatus(todos, "planner", "in_progress");
      const completed = updateTodoStatus(inProgress, "planner", "completed");

      const planner = completed.find((t) => t.id === "planner");
      expect(planner?.status).toBe("completed");
      expect(planner?.completedAt).toBeDefined();
    });

    test("他のタスクに影響しない", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "planner", "in_progress");

      const researcher = updated.find((t) => t.id === "researcher");
      expect(researcher?.status).toBe("pending");
      expect(researcher?.attemptCount).toBe(0);
    });

    test("複数回の試行でattemptCountが増加する", () => {
      const todos = createInitialTodos(false);
      const first = updateTodoStatus(todos, "writer", "in_progress");
      const second = updateTodoStatus(first, "writer", "in_progress");
      const third = updateTodoStatus(second, "writer", "in_progress");

      const writer = third.find((t) => t.id === "writer");
      expect(writer?.attemptCount).toBe(3);
    });

    test("completedへの遷移ではattemptCountが増加しない", () => {
      const todos = createInitialTodos(false);
      const inProgress = updateTodoStatus(todos, "editor", "in_progress");
      const completed = updateTodoStatus(inProgress, "editor", "completed");

      const editor = completed.find((t) => t.id === "editor");
      expect(editor?.attemptCount).toBe(1);
    });
  });

  describe("getPendingTodos", () => {
    test("保留中のタスクのみを取得する", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "researcher", "in_progress");

      const pending = getPendingTodos(updated);

      expect(pending).toHaveLength(4);
      expect(pending.every((t) => t.status === "pending")).toBe(true);
    });

    test("すべて完了している場合は空配列", () => {
      let todos = createInitialTodos(false);
      todos = updateTodoStatus(todos, "researcher", "completed");
      todos = updateTodoStatus(todos, "planner", "completed");
      todos = updateTodoStatus(todos, "writer", "completed");
      todos = updateTodoStatus(todos, "editor", "completed");
      todos = updateTodoStatus(todos, "reviewer", "completed");

      const pending = getPendingTodos(todos);

      expect(pending).toHaveLength(0);
    });

    test("skippedタスクは保留中に含まれない", () => {
      const todos = createInitialTodos(true);
      const pending = getPendingTodos(todos);

      expect(pending.some((t) => t.id === "researcher")).toBe(false);
    });
  });

  describe("getCurrentTodo", () => {
    test("進行中のタスクを取得する", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "writer", "in_progress");

      const current = getCurrentTodo(updated);

      expect(current?.id).toBe("writer");
      expect(current?.status).toBe("in_progress");
    });

    test("進行中のタスクがない場合はundefined", () => {
      const todos = createInitialTodos(false);

      const current = getCurrentTodo(todos);

      expect(current).toBeUndefined();
    });
  });

  describe("getProgressSummary", () => {
    test("初期状態のサマリーを取得する", () => {
      const todos = createInitialTodos(false);

      const summary = getProgressSummary(todos);

      expect(summary.total).toBe(5);
      expect(summary.completed).toBe(0);
      expect(summary.inProgress).toBe(0);
      expect(summary.pending).toBe(5);
      expect(summary.skipped).toBe(0);
      expect(summary.percentage).toBe(0);
    });

    test("進行中のタスクがある場合のサマリー", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "researcher", "in_progress");

      const summary = getProgressSummary(updated);

      expect(summary.completed).toBe(0);
      expect(summary.inProgress).toBe(1);
      expect(summary.pending).toBe(4);
    });

    test("完了タスクがある場合のパーセンテージ", () => {
      let todos = createInitialTodos(false);
      todos = updateTodoStatus(todos, "researcher", "completed");
      todos = updateTodoStatus(todos, "planner", "completed");

      const summary = getProgressSummary(todos);

      expect(summary.completed).toBe(2);
      expect(summary.percentage).toBe(40);
    });

    test("スキップされたタスクは完了扱いでパーセンテージ計算", () => {
      const todos = createInitialTodos(true);

      const summary = getProgressSummary(todos);

      expect(summary.skipped).toBe(1);
      expect(summary.percentage).toBe(20);
    });

    test("全タスク完了時のパーセンテージ", () => {
      let todos = createInitialTodos(false);
      todos = updateTodoStatus(todos, "researcher", "completed");
      todos = updateTodoStatus(todos, "planner", "completed");
      todos = updateTodoStatus(todos, "writer", "completed");
      todos = updateTodoStatus(todos, "editor", "completed");
      todos = updateTodoStatus(todos, "reviewer", "completed");

      const summary = getProgressSummary(todos);

      expect(summary.percentage).toBe(100);
    });
  });

  describe("formatTodoList", () => {
    test("TODOリストをフォーマットする", () => {
      const todos = createInitialTodos(false);
      const formatted = formatTodoList(todos);

      expect(formatted).toContain("⬜");
      expect(formatted).toContain("リサーチ");
      expect(formatted).toContain("構成策划");
    });

    test("in_progressタスクには絵文字が変わる", () => {
      const todos = createInitialTodos(false);
      const updated = updateTodoStatus(todos, "writer", "in_progress");
      const formatted = formatTodoList(updated);

      expect(formatted).toContain("🔄");
      expect(formatted).toContain("執筆");
    });

    test("completedタスクには絵文字が変わる", () => {
      let todos = createInitialTodos(false);
      todos = updateTodoStatus(todos, "researcher", "in_progress");
      todos = updateTodoStatus(todos, "researcher", "completed");
      const formatted = formatTodoList(todos);

      expect(formatted).toContain("✅");
    });

    test("skippedタスクには絵文字が変わる", () => {
      const todos = createInitialTodos(true);
      const formatted = formatTodoList(todos);

      expect(formatted).toContain("⏭️");
    });

    test("試行回数が表示される", () => {
      let todos = createInitialTodos(false);
      todos = updateTodoStatus(todos, "writer", "in_progress");
      todos = updateTodoStatus(todos, "writer", "in_progress");
      const formatted = formatTodoList(todos);

      expect(formatted).toContain("(2回目)");
    });
  });
});
