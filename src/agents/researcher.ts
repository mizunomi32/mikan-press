import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import { RESEARCHER_SYSTEM, RESEARCHER_HUMAN } from "../prompts/researcher.js";
import type { ArticleState } from "../state.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", RESEARCHER_SYSTEM],
  ["human", RESEARCHER_HUMAN],
]);

export async function researcherNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  if (state.skipResearch) {
    logger.info("[Researcher] リサーチをスキップします");
    return {
      research: "（リサーチスキップ）",
      status: "planning",
    };
  }

  logger.info("[Researcher] リサーチを開始します...");
  logger.debug("[Researcher] トピック:", state.topic);
  const model = createModel("researcher");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ topic: state.topic });

  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  logger.debug("[Researcher] 応答:", content.slice(0, 200));
  logger.info("[Researcher] リサーチ完了");
  return {
    research: content,
    status: "planning",
  };
}
