/**
 * エージェントノード生成の共通ロジック
 *
 * 5つのエージェント（Researcher/Planner/Writer/Editor/Reviewer）で
 重複していたコードを統合し、設定オブジェクトによる宣言的な
 * ノード生成を可能にします。
 */

import type { AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { z } from "zod";
import { type AgentRole, createModel } from "@/config.js";
import { logger } from "@/logger.js";
import { withSpinner } from "@/spinner.js";
import type { ArticleState } from "@/state.js";
import { logTokenUsage } from "@/tokenUsage.js";
import { validatePromptInput } from "@/types/prompts.js";

// ============================================================================
// 型定義
// ============================================================================

/**
 * ArticleState のリトライカウントフィールド名の型
 */
export type RetryKey =
  | "researcherRetryCount"
  | "plannerRetryCount"
  | "writerRetryCount"
  | "editorRetryCount";

/**
 * 標準エージェントの設定オブジェクト
 */
export interface AgentConfig<
  TInput extends Record<string, unknown>,
  TRetryKey extends RetryKey,
  TInputSchema extends z.ZodType,
> {
  /** エージェント名（ログ出力用） */
  name: string;
  /** モデル種別 */
  modelType: AgentRole;
  /** システムプロンプト */
  systemPrompt: string;
  /** ヒューマンプロンプトテンプレート */
  humanPromptTemplate: string;
  /** 入力バリデーション用 Zod スキーマ */
  inputSchema: TInputSchema;
  /** ステートから入力値を抽出する関数 */
  inputExtractor: (state: typeof ArticleState.State) => TInput;
  /** AI応答からステート更新値を生成する関数 */
  outputMapper: (
    content: string,
    state: typeof ArticleState.State,
  ) => Partial<typeof ArticleState.State>;
  /** 次のステータス（PROCEED時） */
  nextStatus: string;
  /** リトライカウントのキー名 */
  retryKey: TRetryKey;
  /** 完了メッセージ */
  completionMessage: string;
  /** スキップ条件（オプション） */
  skipCondition?: (state: typeof ArticleState.State) => boolean;
  /** スキップ時のレスポンス（オプション） */
  skipResponse?: Partial<typeof ArticleState.State>;
  /** 改稿用の設定（オプション・Writer用） */
  revisionConfig?: RevisionConfig<TInput, TInputSchema>;
}

/**
 * 改稿用の追加設定
 */
export interface RevisionConfig<
  TInput extends Record<string, unknown>,
  TInputSchema extends z.ZodType,
> {
  /** 改稿用ヒューマンプロンプト */
  humanPromptTemplate: string;
  /** 改稿時の入力抽出関数 */
  inputExtractor: (state: typeof ArticleState.State) => TInput;
  /** 改稿完了メッセージ */
  completionMessage: string;
  /** 改稿モード適用条件 */
  condition: (state: typeof ArticleState.State) => boolean;
  /** 改稿時の入力バリデーション用 Zod スキーマ */
  inputSchema: TInputSchema;
}

/**
 * Reviewer専用エージェントの設定オブジェクト
 */
export interface ReviewerAgentConfig<TInputSchema extends z.ZodType> {
  /** エージェント名（ログ出力用） */
  name: string;
  /** モデル種別 */
  modelType: AgentRole;
  /** システムプロンプト */
  systemPrompt: string;
  /** ヒューマンプロンプトテンプレート */
  humanPromptTemplate: string;
  /** 入力バリデーション用 Zod スキーマ */
  inputSchema: TInputSchema;
  /** ステートから入力値を抽出する関数 */
  inputExtractor: (state: typeof ArticleState.State) => Record<string, unknown>;
}

// ============================================================================
// 共通ユーティリティ関数
// ============================================================================

/**
 * AI応答からRETRY判定とコンテンツを抽出
 *
 * @param raw - AIの生応答文字列
 * @returns needRetry（再実行要否）とクリーニング済みコンテンツ
 */
export function parseRetryResponse(raw: string): {
  needRetry: boolean;
  content: string;
} {
  const trimmed = raw.trim();
  const needRetry = /\bretry\s*$/im.test(trimmed);
  const content = trimmed.replace(/\n*(PROCEED|RETRY)\s*$/i, "").trim();
  return { needRetry, content };
}

/**
 * モデルチェーン実行（スピナー・トークンログ含む）
 *
 * @param agentName - エージェント名（ログ用）
 * @param modelType - モデル種別
 * @param prompt - チャットプロンプトテンプレート
 * @param input - プロンプト入力値
 * @returns AI応答メッセージ
 */
export async function executeAgentChain<T extends Record<string, unknown>>(
  agentName: string,
  modelType: AgentRole,
  prompt: ChatPromptTemplate,
  input: T,
): Promise<AIMessage> {
  const model = createModel(modelType);
  const chain = prompt.pipe(model);
  const result = await withSpinner(`[${agentName}] 思考中...`, () => chain.invoke(input));
  logTokenUsage(agentName, result as unknown);
  return result as AIMessage;
}

// ============================================================================
// エージェントノード生成関数
// ============================================================================

/**
 * 標準エージェントノードを生成
 *
 * 共通処理（リトライカウント・モデル実行・レスポンス解析・ステータス更新）を
 * 一箇所に集約し、設定オブジェクトにより各エージェントの挙動を定義します。
 *
 * @param config - エージェント設定オブジェクト
 * @returns LangGraphノード関数
 */
export function createStandardAgent<
  TInput extends Record<string, unknown>,
  TRetryKey extends RetryKey,
  TInputSchema extends z.ZodType,
>(
  config: AgentConfig<TInput, TRetryKey, TInputSchema>,
): (state: typeof ArticleState.State) => Promise<Partial<typeof ArticleState.State>> {
  const {
    name,
    modelType,
    systemPrompt,
    humanPromptTemplate,
    inputSchema,
    inputExtractor,
    outputMapper,
    nextStatus,
    retryKey,
    completionMessage,
    skipCondition,
    skipResponse,
    revisionConfig,
  } = config;

  // 改稿用プロンプトの事前構築（設定がある場合）
  const revisionPrompt = revisionConfig
    ? ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", revisionConfig.humanPromptTemplate],
      ])
    : null;

  // 初回用プロンプト
  const initialPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", humanPromptTemplate],
  ]);

  return async (state: typeof ArticleState.State): Promise<Partial<typeof ArticleState.State>> => {
    // スキップ条件チェック
    if (skipCondition && skipResponse && skipCondition(state)) {
      logger.info(`[${name}] 処理をスキップします`);
      return skipResponse;
    }

    // 改稿モード判定
    const isRevision = revisionConfig?.condition(state);

    // 現在の試行回数
    const currentCount = (state[retryKey] ?? 0) as number;
    const attempt = currentCount + 1;

    // 入力値の抽出
    const extractedInput = isRevision
      ? (revisionConfig?.inputExtractor(state) as TInput)
      : inputExtractor(state);

    // 入力バリデーション（改稿時は revisionConfig.inputSchema、初回は inputSchema）
    const schema = isRevision && revisionConfig ? revisionConfig.inputSchema : inputSchema;
    const input = validatePromptInput(schema, extractedInput as Record<string, unknown>, name);

    // デバッグログ（各エージェント固有の値）
    logger.debug(`[${name}] 入力:`, JSON.stringify(input).slice(0, 200));

    // 開始ログ
    logger.info(
      `[${name}] 処理を開始します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`,
    );

    // モデル実行
    const prompt = isRevision && revisionPrompt ? revisionPrompt : initialPrompt;
    const result = await executeAgentChain(
      name,
      modelType,
      prompt,
      input as Record<string, unknown>,
    );

    // レスポンス解析
    const raw =
      typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    const { needRetry, content } = parseRetryResponse(raw);

    // デバッグログ（応答内容）
    logger.debug(`[${name}] 応答:`, content.slice(0, 200));

    // リトライカウント更新
    const nextCount = needRetry ? currentCount + 1 : currentCount;

    // 自己ループ判定ログ
    const retryOrProceed = needRetry ? "RETRY" : "PROCEED";
    const nextAction = needRetry
      ? ` → 再実行します（次は${nextCount + 1}回目）`
      : ` → ${nextStatus} へ`;
    logger.info(`[${name}] 自己ループ判定: ${retryOrProceed}（${attempt}回目実施）${nextAction}`);

    // 完了ログ（PROCEED時のみ）
    if (!needRetry) {
      const message = isRevision ? revisionConfig?.completionMessage : completionMessage;
      logger.info(`[${name}] ${message}`);
    }

    // ステート更新値の構築
    return {
      ...outputMapper(content, state),
      status: nextStatus as typeof ArticleState.State.status,
      needRetry,
      [retryKey]: nextCount,
    };
  };
}

/**
 * Reviewer専用エージェントノードを生成
 *
 * ReviewerはAPPROVE/REVISE判定と最大レビュー回数チェックという
 * 特殊なロジックを持つため、専用の生成関数を用意します。
 *
 * @param config - Reviewer設定オブジェクト
 * @returns LangGraphノード関数
 */
export function createReviewerAgent<TInputSchema extends z.ZodType>(
  config: ReviewerAgentConfig<TInputSchema>,
): (state: typeof ArticleState.State) => Promise<Partial<typeof ArticleState.State>> {
  const { name, modelType, systemPrompt, humanPromptTemplate, inputSchema, inputExtractor } =
    config;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", humanPromptTemplate],
  ]);

  return async (state: typeof ArticleState.State): Promise<Partial<typeof ArticleState.State>> => {
    const currentCount = state.reviewCount ?? 0;
    const maxReviews = state.maxReviews ?? 3;

    logger.info(`[${name}] レビューを実施します（${currentCount + 1}回目）...`);

    // デバッグログ
    logger.debug(`[${name}] 編集済み原稿:`, state.editedDraft.slice(0, 200));

    // 入力値の抽出とバリデーション
    const extractedInput = inputExtractor(state);
    const input = validatePromptInput(inputSchema, extractedInput as Record<string, unknown>, name);

    // モデル実行
    const result = await executeAgentChain(
      name,
      modelType,
      prompt,
      input as Record<string, unknown>,
    );

    // レスポンス抽出
    const reviewText =
      typeof result.content === "string" ? result.content : JSON.stringify(result.content);

    logger.debug(`[${name}] 応答:`, reviewText.slice(0, 200));

    // APPROVE/REVISE 判定
    const isApproved = reviewText.includes("APPROVE");
    const reachedLimit = currentCount + 1 >= maxReviews;

    if (isApproved) {
      logger.info(`[${name}] 記事を承認しました`);
    } else if (reachedLimit) {
      logger.info(
        `[${name}] 差し戻し判定ですが、最大レビュー回数（${maxReviews}回）に達したため終了します`,
      );
    } else {
      logger.info(`[${name}] 差し戻しします`);
    }

    const isDone = isApproved || reachedLimit;

    return {
      review: reviewText,
      reviewCount: currentCount + 1,
      finalArticle: isDone ? state.editedDraft : undefined,
      status: (isDone ? "done" : "writing") as typeof ArticleState.State.status,
    };
  };
}
