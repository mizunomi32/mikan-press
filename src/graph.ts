import { END, START, StateGraph } from "@langchain/langgraph";
import { editorNode } from "@/agents/editor.js";
import { plannerNode } from "@/agents/planner.js";
import { researcherNode } from "@/agents/researcher.js";
import { reviewerNode } from "@/agents/reviewer.js";
import { writerNode } from "@/agents/writer.js";
import { ArticleState } from "@/state.js";

const max = (state: typeof ArticleState.State) => state.maxRetriesPerAgent ?? 1;

// maxRetriesPerAgent = 許容するやり直し回数（1 → 最大2回実行）
function researcherRouter(state: typeof ArticleState.State): "researcher" | "planner" {
  const retry = state.needRetry && (state.researcherRetryCount ?? 0) <= max(state);
  return retry ? "researcher" : "planner";
}

function plannerRouter(state: typeof ArticleState.State): "planner" | "writer" {
  const retry = state.needRetry && (state.plannerRetryCount ?? 0) <= max(state);
  return retry ? "planner" : "writer";
}

function writerRouter(state: typeof ArticleState.State): "writer" | "editor" {
  const retry = state.needRetry && (state.writerRetryCount ?? 0) <= max(state);
  return retry ? "writer" : "editor";
}

function editorRouter(state: typeof ArticleState.State): "editor" | "reviewer" {
  const retry = state.needRetry && (state.editorRetryCount ?? 0) <= max(state);
  return retry ? "editor" : "reviewer";
}

function reviewRouter(state: typeof ArticleState.State): "writer" | "__end__" {
  return state.status === "done" ? "__end__" : "writer";
}

export function buildGraph() {
  const graph = new StateGraph(ArticleState)
    .addNode("researcher", researcherNode)
    .addNode("planner", plannerNode)
    .addNode("writer", writerNode)
    .addNode("editor", editorNode)
    .addNode("reviewer", reviewerNode)
    .addEdge(START, "researcher")
    .addConditionalEdges("researcher", researcherRouter, {
      researcher: "researcher",
      planner: "planner",
    })
    .addConditionalEdges("planner", plannerRouter, {
      planner: "planner",
      writer: "writer",
    })
    .addConditionalEdges("writer", writerRouter, {
      writer: "writer",
      editor: "editor",
    })
    .addConditionalEdges("editor", editorRouter, {
      editor: "editor",
      reviewer: "reviewer",
    })
    .addConditionalEdges("reviewer", reviewRouter, {
      writer: "writer",
      __end__: END,
    });

  return graph.compile();
}
