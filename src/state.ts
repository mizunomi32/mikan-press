import { Annotation } from "@langchain/langgraph";

export const ArticleState = Annotation.Root({
  topic: Annotation<string>,
  research: Annotation<string>,
  outline: Annotation<string>,
  draft: Annotation<string>,
  editedDraft: Annotation<string>,
  review: Annotation<string>,
  finalArticle: Annotation<string>,
  reviewCount: Annotation<number>,
  maxReviews: Annotation<number>,
  skipResearch: Annotation<boolean>,
  status: Annotation<
    | "researching"
    | "planning"
    | "writing"
    | "editing"
    | "reviewing"
    | "done"
  >,
  // 各エージェントの自己ループ用
  needRetry: Annotation<boolean>,
  maxRetriesPerAgent: Annotation<number>,
  researcherRetryCount: Annotation<number>,
  plannerRetryCount: Annotation<number>,
  writerRetryCount: Annotation<number>,
  editorRetryCount: Annotation<number>,
});
