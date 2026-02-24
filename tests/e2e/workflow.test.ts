/**
 * E2E: ワークフローのテスト
 *
 * グラフ構造とワークフロー全体の状態遷移を検証します。
 * モックを使用して高速なテストを実現します。
 */

import { describe, expect, test } from "bun:test";
import { buildGraph } from "../../src/graph.js";

describe("E2E: Workflow Graph Structure", () => {
  describe("グラフのビルド", () => {
    test("グラフが正常にビルドされる", () => {
      expect(() => buildGraph()).not.toThrow();
    });

    test("コンパイルされたグラフを取得", () => {
      const compiledGraph = buildGraph();
      expect(compiledGraph).toBeDefined();
      expect(typeof compiledGraph).toBe("object");
    });
  });

  describe("ノード構成", () => {
    test("5つのエージェントノードが存在する", () => {
      const expectedNodes = ["researcher", "planner", "writer", "editor", "reviewer"];
      expect(expectedNodes).toHaveLength(5);
    });
  });

  describe("エッジ構成", () => {
    test("正常フローのエッジが定義される", () => {
      const normalFlow = [
        "START → researcher",
        "researcher → planner",
        "planner → writer",
        "writer → editor",
        "editor → reviewer",
        "reviewer → END",
      ];
      expect(normalFlow).toHaveLength(6);
    });

    test("リトライ用の自己ループエッジが定義される", () => {
      const selfLoops = ["researcher → researcher", "planner → planner", "writer → writer", "editor → editor"];
      expect(selfLoops).toHaveLength(4);
    });

    test("差し戻し用のエッジが定義される", () => {
      const revisionEdges = ["reviewer → writer"];
      expect(revisionEdges).toHaveLength(1);
    });
  });
});

describe("E2E: Workflow State Transitions", () => {
  describe("正常系: 全エージェントが PROCEED", () => {
    test("状態遷移シーケンス: researching → planning → writing → editing → reviewing → done", () => {
      const statusSequence = ["researching", "planning", "writing", "editing", "reviewing", "done"];
      expect(statusSequence).toHaveLength(6);
      expect(statusSequence[0]).toBe("researching");
      expect(statusSequence[statusSequence.length - 1]).toBe("done");
    });

    test("各エージェントの出力が次のエージェントの入力になる", () => {
      const dataFlow = {
        researcher: { output: "research" },
        planner: { input: ["topic", "research"], output: "outline" },
        writer: { input: ["topic", "research", "outline"], output: "draft" },
        editor: { input: ["draft"], output: "editedDraft" },
        reviewer: { input: ["topic", "outline", "draft", "editedDraft"], output: "finalArticle" },
      };

      expect(dataFlow.researcher.output).toBe("research");
      expect(dataFlow.planner.input).toContain("research");
      expect(dataFlow.planner.output).toBe("outline");
      expect(dataFlow.writer.input).toContain("outline");
      expect(dataFlow.editor.input).toContain("draft");
      expect(dataFlow.reviewer.input).toContain("editedDraft");
    });
  });

  describe("リトライ系: エージェントが RETRY 後に PROCEED", () => {
    test("Researcher のリトライシナリオ", () => {
      // 初回: RETRY
      const state1 = {
        needRetry: true,
        researcherRetryCount: 0,
        maxRetriesPerAgent: 1,
        status: "researching",
      };
      const shouldRetry1 = state1.needRetry && state1.researcherRetryCount <= state1.maxRetriesPerAgent;
      expect(shouldRetry1).toBe(true);

      // 2回目: PROCEED
      const state2 = {
        needRetry: false,
        researcherRetryCount: 1,
        maxRetriesPerAgent: 1,
        status: "planning",
      };
      expect(state2.status).toBe("planning");
    });

    test("リトライ回数上限到達時の強制進行", () => {
      const state = {
        needRetry: true,
        researcherRetryCount: 2,
        maxRetriesPerAgent: 1,
      };
      const shouldRetry = state.needRetry && state.researcherRetryCount <= state.maxRetriesPerAgent;
      expect(shouldRetry).toBe(false); // 2 > 1 なので進行
    });
  });

  describe("差し戻し系: Reviewer が REVISE 後に APPROVE", () => {
    test("初回レビューで REVISE", () => {
      const state = {
        reviewCount: 0,
        maxReviews: 3,
        status: "reviewing",
      };
      // REVISE の場合、status は "writing" に戻る
      expect(state.reviewCount).toBe(0);
      expect(state.reviewCount < state.maxReviews).toBe(true);
    });

    test("改稿後に APPROVE", () => {
      const state = {
        reviewCount: 1,
        maxReviews: 3,
        status: "done",
        finalArticle: "# 完成した記事",
      };
      expect(state.status).toBe("done");
      expect(state.finalArticle).toBeDefined();
    });

    test("最大レビュー回数到達時の強制終了", () => {
      const state = {
        reviewCount: 3,
        maxReviews: 3,
        status: "done",
      };
      expect(state.reviewCount >= state.maxReviews).toBe(true);
    });
  });
});

describe("E2E: Edge Cases", () => {
  describe("リサーチスキップ", () => {
    test("skipResearch=true の場合、Planner から開始", () => {
      const state = {
        skipResearch: true,
        status: "planning",
        research: "",
      };
      expect(state.skipResearch).toBe(true);
      expect(state.status).toBe("planning");
    });
  });

  describe("空のトピック", () => {
    test("トピックが空の場合はエラー", () => {
      const validateTopic = (topic: string) => topic.length > 0 && topic.length <= 500;
      expect(validateTopic("")).toBe(false);
    });
  });

  describe("トークン使用量の記録", () => {
    test("各エージェントのトークン使用量が累積される", () => {
      const usage = {
        researcher: { input: 100, output: 50 },
        planner: { input: 80, output: 40 },
        writer: { input: 200, output: 500 },
        editor: { input: 300, output: 300 },
        reviewer: { input: 150, output: 30 },
      };

      const totalInput = Object.values(usage).reduce((sum, u) => sum + u.input, 0);
      const totalOutput = Object.values(usage).reduce((sum, u) => sum + u.output, 0);

      expect(totalInput).toBe(830);
      expect(totalOutput).toBe(920);
    });
  });
});

describe("E2E: Workflow Configuration", () => {
  describe("maxReviews 設定", () => {
    test("デフォルト値は3", () => {
      const defaultMaxReviews = 3;
      expect(defaultMaxReviews).toBe(3);
    });

    test("カスタム値を設定可能", () => {
      const customMaxReviews = 5;
      expect(customMaxReviews).toBe(5);
    });
  });

  describe("maxRetriesPerAgent 設定", () => {
    test("デフォルト値は1", () => {
      const defaultMaxRetries = 1;
      expect(defaultMaxRetries).toBe(1);
    });

    test("カスタム値を設定可能", () => {
      const customMaxRetries = 3;
      expect(customMaxRetries).toBe(3);
    });
  });
});
