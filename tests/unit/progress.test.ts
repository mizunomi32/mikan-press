/**
 * progress.ts のテスト
 *
 * 進捗管理機能を検証します。
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  type AgentName,
  getProgressTracker,
  type ProgressTracker,
  resetProgressTracker,
} from "../../src/progress.js";

describe("progress.ts", () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    resetProgressTracker();
    tracker = getProgressTracker();
  });

  afterEach(() => {
    resetProgressTracker();
  });

  describe("ProgressTracker", () => {
    test("進捗追跡を開始する", () => {
      tracker.start(3);
      // エラーが投げられないことを確認
      expect(tracker).toBeDefined();
    });

    test("エージェントを更新する", () => {
      tracker.start(3);
      tracker.updateAgent("researcher");
      tracker.updateAgent("planner");
      tracker.updateAgent("writer");
      // エラーが投げられないことを確認
      expect(tracker).toBeDefined();
    });

    test("レビュアーでレビュー回数を更新する", () => {
      tracker.start(3);
      tracker.updateAgent("researcher");
      tracker.updateAgent("planner");
      tracker.updateAgent("writer");
      tracker.updateAgent("editor");
      tracker.updateAgent("reviewer", 1);
      tracker.updateAgent("writer");
      tracker.updateAgent("editor");
      tracker.updateAgent("reviewer", 2);
      // エラーが投げられないことを確認
      expect(tracker).toBeDefined();
    });

    test("進捗を完了する", () => {
      tracker.start(3);
      tracker.updateAgent("researcher");
      tracker.complete();
      // エラーが投げられないことを確認
      expect(tracker).toBeDefined();
    });

    test("すべてのエージェントを順番に実行する", () => {
      tracker.start(3);
      const agents: AgentName[] = ["researcher", "planner", "writer", "editor", "reviewer"];
      for (const agent of agents) {
        tracker.updateAgent(agent);
      }
      tracker.complete();
      expect(tracker).toBeDefined();
    });

    test("複数回のレビューをシミュレートする", () => {
      tracker.start(3);

      // 最初のサイクル
      tracker.updateAgent("researcher");
      tracker.updateAgent("planner");
      tracker.updateAgent("writer");
      tracker.updateAgent("editor");
      tracker.updateAgent("reviewer", 1);

      // 2回目のサイクル（差し戻し）
      tracker.updateAgent("writer");
      tracker.updateAgent("editor");
      tracker.updateAgent("reviewer", 2);

      // 3回目のサイクル（差し戻し）
      tracker.updateAgent("writer");
      tracker.updateAgent("editor");
      tracker.updateAgent("reviewer", 3);

      tracker.complete();
      expect(tracker).toBeDefined();
    });
  });

  describe("getProgressTracker", () => {
    test("グローバルトラッカーを取得する", () => {
      resetProgressTracker();
      const t1 = getProgressTracker();
      const t2 = getProgressTracker();
      expect(t1).toBe(t2);
    });
  });

  describe("resetProgressTracker", () => {
    test("グローバルトラッカーをリセットする", () => {
      const t1 = getProgressTracker();
      resetProgressTracker();
      const t2 = getProgressTracker();
      expect(t1).not.toBe(t2);
    });
  });
});
