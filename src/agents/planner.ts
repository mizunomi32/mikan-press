import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import { PLANNER_SYSTEM, PLANNER_HUMAN } from "../prompts/planner.js";
import type { ArticleState } from "../state.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", PLANNER_SYSTEM],
  ["human", PLANNER_HUMAN],
]);

export async function plannerNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  logger.info("[Planner] アウトラインを作成します...");
  logger.debug("[Planner] トピック:", state.topic);
  logger.debug("[Planner] リサーチ:", state.research.slice(0, 200));
  const model = createModel("planner");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    topic: state.topic,
    research: state.research,
  });

  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  logger.debug("[Planner] 応答:", content.slice(0, 200));
  logger.info("[Planner] アウトライン作成完了");
  return {
    outline: content,
    status: "writing",
  };
}
