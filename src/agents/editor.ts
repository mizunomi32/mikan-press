import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import { EDITOR_SYSTEM, EDITOR_HUMAN } from "../prompts/editor.js";
import type { ArticleState } from "../state.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", EDITOR_SYSTEM],
  ["human", EDITOR_HUMAN],
]);

export async function editorNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  const attempt = (state.editorRetryCount ?? 0) + 1;
  logger.info(
    `[Editor] 編集・校正を行います...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`
  );
  logger.debug("[Editor] 原稿:", state.draft.slice(0, 200));
  const model = createModel("editor");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ draft: state.draft });

  const raw =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);
  const needRetry = raw.includes("RETRY");
  const content = raw.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
  logger.debug("[Editor] 応答:", content.slice(0, 200));
  const nextCount = needRetry ? (state.editorRetryCount ?? 0) + 1 : (state.editorRetryCount ?? 0);
  logger.info(
    `[Editor] 自己ループ判定: ${needRetry ? "RETRY" : "PROCEED"}（${attempt}回目実施）${needRetry ? ` → 再実行します（次は${nextCount + 1}回目）` : " → Reviewer へ"}`
  );
  if (!needRetry) logger.info("[Editor] 編集完了");
  return {
    editedDraft: content,
    status: "reviewing",
    needRetry,
    editorRetryCount: nextCount,
  };
}
