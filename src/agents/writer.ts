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

  if (isRevision) {
    logger.info("[Writer] レビューを踏まえて書き直します...");
    logger.debug("[Writer] レビュー内容:", state.review.slice(0, 200));
    const chain = revisionPrompt.pipe(model);
    const result = await chain.invoke({
      topic: state.topic,
      research: state.research,
      outline: state.outline,
      draft: state.editedDraft || state.draft,
      review: state.review,
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.debug("[Writer] 応答:", content.slice(0, 200));
    logger.info("[Writer] 改稿完了");
    return { draft: content, status: "editing" };
  }

  logger.info("[Writer] 初稿を執筆します...");
  logger.debug("[Writer] アウトライン:", state.outline.slice(0, 200));
  const chain = initialPrompt.pipe(model);
  const result = await chain.invoke({
    topic: state.topic,
    research: state.research,
    outline: state.outline,
  });

  const content =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);
  logger.debug("[Writer] 応答:", content.slice(0, 200));
  logger.info("[Writer] 初稿完了");
  return { draft: content, status: "editing" };
}
