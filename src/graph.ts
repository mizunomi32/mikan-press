import { StateGraph, START, END } from "@langchain/langgraph";
import { ArticleState } from "./state.js";
import { researcherNode } from "./agents/researcher.js";
import { plannerNode } from "./agents/planner.js";
import { writerNode } from "./agents/writer.js";
import { editorNode } from "./agents/editor.js";
import { reviewerNode } from "./agents/reviewer.js";

function reviewRouter(
  state: typeof ArticleState.State
): "writer" | "__end__" {
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
    .addEdge("researcher", "planner")
    .addEdge("planner", "writer")
    .addEdge("writer", "editor")
    .addEdge("editor", "reviewer")
    .addConditionalEdges("reviewer", reviewRouter, {
      writer: "writer",
      __end__: END,
    });

  return graph.compile();
}
