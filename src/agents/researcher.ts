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

  const attempt = (state.researcherRetryCount ?? 0) + 1;
  logger.info(
    `[Researcher] リサーチを開始します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`
  );
  logger.debug("[Researcher] トピック:", state.topic);
  const model = createModel("researcher");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ topic: state.topic });

  const raw = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const needRetry = raw.includes("RETRY");
  const content = raw.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
  logger.debug("[Researcher] 応答:", content.slice(0, 200));
  const nextCount = needRetry ? (state.researcherRetryCount ?? 0) + 1 : (state.researcherRetryCount ?? 0);
  logger.info(
    `[Researcher] 自己ループ判定: ${needRetry ? "RETRY" : "PROCEED"}（${attempt}回目実施）${needRetry ? ` → 再実行します（次は${nextCount + 1}回目）` : " → Planner へ"}`
  );
  if (!needRetry) logger.info("[Researcher] リサーチ完了");
  return {
    research: content,
    status: "planning",
    needRetry,
    researcherRetryCount: nextCount,
  };
}
