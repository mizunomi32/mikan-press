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
  logger.info("[Editor] 編集・校正を行います...");
  logger.debug("[Editor] 原稿:", state.draft.slice(0, 200));
  const model = createModel("editor");
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ draft: state.draft });

  const content =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);
  logger.debug("[Editor] 応答:", content.slice(0, 200));
  logger.info("[Editor] 編集完了");
  return {
    editedDraft: content,
    status: "reviewing",
  };
}
