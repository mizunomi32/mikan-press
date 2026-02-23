import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import { withSpinner } from "../spinner.js";
import { logTokenUsage } from "../tokenUsage.js";
import { PLANNER_SYSTEM, PLANNER_HUMAN } from "../prompts/planner.js";
import type { ArticleState } from "../state.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", PLANNER_SYSTEM],
  ["human", PLANNER_HUMAN],
]);

export async function plannerNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  const attempt = (state.plannerRetryCount ?? 0) + 1;
  logger.info(
    `[Planner] アウトラインを作成します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`
  );
  logger.debug("[Planner] トピック:", state.topic);
  logger.debug("[Planner] リサーチ:", state.research.slice(0, 200));
  const model = createModel("planner");
  const chain = prompt.pipe(model);
  const result = await withSpinner("[Planner] 思考中...", () =>
    chain.invoke({
      topic: state.topic,
      research: state.research,
    })
  );
  logTokenUsage("Planner", result as unknown);

  const raw = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const trimmed = raw.trim();
  const needRetry = /\bretry\s*$/im.test(trimmed);
  const content = trimmed.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
  logger.debug("[Planner] 応答:", content.slice(0, 200));
  const nextCount = needRetry ? (state.plannerRetryCount ?? 0) + 1 : (state.plannerRetryCount ?? 0);
  logger.info(
    `[Planner] 自己ループ判定: ${needRetry ? "RETRY" : "PROCEED"}（${attempt}回目実施）${needRetry ? ` → 再実行します（次は${nextCount + 1}回目）` : " → Writer へ"}`
  );
  if (!needRetry) logger.info("[Planner] アウトライン作成完了");
  return {
    outline: content,
    status: "writing",
    needRetry,
    plannerRetryCount: nextCount,
  };
}
