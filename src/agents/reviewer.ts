import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../config.js";
import { logger } from "../logger.js";
import { REVIEWER_SYSTEM, REVIEWER_HUMAN } from "../prompts/reviewer.js";
import type { ArticleState } from "../state.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", REVIEWER_SYSTEM],
  ["human", REVIEWER_HUMAN],
]);

export async function reviewerNode(
  state: typeof ArticleState.State
): Promise<Partial<typeof ArticleState.State>> {
  const currentCount = state.reviewCount ?? 0;
  logger.info(
    `[Reviewer] レビューを実施します（${currentCount + 1}回目）...`
  );
  logger.debug("[Reviewer] 編集済み原稿:", state.editedDraft.slice(0, 200));

  const model = createModel("reviewer");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    outline: state.outline,
    editedDraft: state.editedDraft,
  });

  const reviewText =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);

  logger.debug("[Reviewer] 応答:", reviewText.slice(0, 200));

  const isApproved = reviewText.includes("APPROVE");
  const maxReviews = state.maxReviews ?? 3;
  const reachedLimit = currentCount + 1 >= maxReviews;

  if (isApproved) {
    logger.info("[Reviewer] 記事を承認しました");
  } else if (reachedLimit) {
    logger.info(
      `[Reviewer] 差し戻し判定ですが、最大レビュー回数（${maxReviews}回）に達したため終了します`
    );
  } else {
    logger.info("[Reviewer] 差し戻しします");
  }

  const isDone = isApproved || reachedLimit;

  return {
    review: reviewText,
    reviewCount: currentCount + 1,
    finalArticle: isDone ? state.editedDraft : undefined,
    status: isDone ? "done" : "writing",
  };
}
