import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import {
  WRITER_SYSTEM,
  WRITER_HUMAN,
  WRITER_REVISION_HUMAN,
} from "../prompts/writer.js";
import type { ArticleState } from "../state.js";

const initialPrompt = ChatPromptTemplate.fromMessages([
  ["system", WRITER_SYSTEM],
  ["human", WRITER_HUMAN],
]);

const revisionPrompt = ChatPromptTemplate.fromMessages([
  ["system", WRITER_SYSTEM],
  ["human", WRITER_REVISION_HUMAN],
]);

export async function writerNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  const model = createModel("writer");
  const isRevision = !!state.review;

  const attempt = (state.writerRetryCount ?? 0) + 1;

  if (isRevision) {
    logger.info(
      `[Writer] レビューを踏まえて書き直します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`
    );
    logger.debug("[Writer] レビュー内容:", state.review.slice(0, 200));
    const chain = revisionPrompt.pipe(model);
    const result = await chain.invoke({
      topic: state.topic,
      research: state.research,
      outline: state.outline,
      draft: state.editedDraft || state.draft,
      review: state.review,
    });

    const raw =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    const needRetry = raw.includes("RETRY");
    const content = raw.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
    logger.debug("[Writer] 応答:", content.slice(0, 200));
    const nextCount = needRetry ? (state.writerRetryCount ?? 0) + 1 : (state.writerRetryCount ?? 0);
    logger.info(
      `[Writer] 自己ループ判定: ${needRetry ? "RETRY" : "PROCEED"}（${attempt}回目実施）${needRetry ? ` → 再実行します（次は${nextCount + 1}回目）` : " → Editor へ"}`
    );
    if (!needRetry) logger.info("[Writer] 改稿完了");
    return {
      draft: content,
      status: "editing",
      needRetry,
      writerRetryCount: nextCount,
    };
  }

  logger.info(
    `[Writer] 初稿を執筆します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`
  );
  logger.debug("[Writer] アウトライン:", state.outline.slice(0, 200));
  const chain = initialPrompt.pipe(model);
  const result = await chain.invoke({
    topic: state.topic,
    research: state.research,
    outline: state.outline,
  });

  const raw =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);
  const needRetry = raw.includes("RETRY");
  const content = raw.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
  logger.debug("[Writer] 応答:", content.slice(0, 200));
  const nextCount = needRetry ? (state.writerRetryCount ?? 0) + 1 : (state.writerRetryCount ?? 0);
  logger.info(
    `[Writer] 自己ループ判定: ${needRetry ? "RETRY" : "PROCEED"}（${attempt}回目実施）${needRetry ? ` → 再実行します（次は${nextCount + 1}回目）` : " → Editor へ"}`
  );
  if (!needRetry) logger.info("[Writer] 初稿完了");
  return {
    draft: content,
    status: "editing",
    needRetry,
    writerRetryCount: nextCount,
  };
}
