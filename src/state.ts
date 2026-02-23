import { Annotation } from "@langchain/langgraph";

/**
 * TODOタスクの状態
 */
export type TodoStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * TODOタスクの項目
 */
export interface TodoItem {
  /** タスクID（エージェント名と対応） */
  id: string;
  /** タスク名（表示用） */
  name: string;
  /** 現在の状態 */
  status: TodoStatus;
  /** 開始時刻（ISO形式） */
  startedAt?: string;
  /** 完了時刻（ISO形式） */
  completedAt?: string;
  /** 試行回数 */
  attemptCount: number;
}

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
  status: Annotation<"researching" | "planning" | "writing" | "editing" | "reviewing" | "done">,
  // 各エージェントの自己ループ用
  needRetry: Annotation<boolean>,
  maxRetriesPerAgent: Annotation<number>,
  researcherRetryCount: Annotation<number>,
  plannerRetryCount: Annotation<number>,
  writerRetryCount: Annotation<number>,
  editorRetryCount: Annotation<number>,
  // Web検索関連
  searchResults: Annotation<string>,
  searchQueries: Annotation<string[]>,
  // TODO管理
  todos: Annotation<TodoItem[]>,
  currentTodoId: Annotation<string | null>,
});
