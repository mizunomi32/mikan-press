/**
 * エージェントノード生成の共通ロジック
 *
 * 5つのエージェント（Researcher/Planner/Writer/Editor/Reviewer）で
 重複していたコードを統合し、設定オブジェクトによる宣言的な
 * ノード生成を可能にします。
 */

import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { z } from "zod";
import { type AgentRole, createModel, getProvider, getRetryConfig } from "@/config.js";
import { AgentError } from "@/errors/index.js";
import { logger } from "@/logger.js";
import { withSpinner } from "@/spinner.js";
import type { ArticleState } from "@/state.js";
import { logTokenUsage } from "@/tokenUsage.js";
import { validatePromptInput } from "@/types/prompts.js";
import { withModelRetry } from "@/utils/retry.js";

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
 * ツール対応エージェントの設定オブジェクト
 *
 * AgentConfigを拡張し、ツール使用を追加でサポートします。
 */
export interface ToolEnabledAgentConfig<
  TInput extends Record<string, unknown>,
  TRetryKey extends RetryKey,
  TInputSchema extends z.ZodType,
> extends AgentConfig<TInput, TRetryKey, TInputSchema> {
  /** 使用可能なツール配列（オプション） */
  tools?: StructuredToolInterface[];
  /** 最小出力文字数（下回ればRETRY） */
  minOutputLength?: number;
  /** ツール使用を必須とするか */
  requireToolUse?: boolean;
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
 * リトライロジックを含み、APIエラー時に指数バックオフで再試行します。
 *
 * @param agentName - エージェント名（ログ用）
 * @param modelType - モデル種別
 * @param prompt - チャットプロンプトテンプレート
 * @param input - プロンプト入力値
 * @returns AI応答メッセージ
 * @throws AgentError リトライ不可能なエラーまたは最大リトライ回数超過時
 */
export async function executeAgentChain<T extends Record<string, unknown>>(
  agentName: string,
  modelType: AgentRole,
  prompt: ChatPromptTemplate,
  input: T,
): Promise<AIMessage> {
  const model = createModel(modelType);
  const chain = prompt.pipe(model);
  const provider = getProvider(modelType);
  const retryConfig = getRetryConfig();

  try {
    const result = await withModelRetry(
      () => withSpinner(`[${agentName}] 思考中...`, () => chain.invoke(input)),
      agentName,
      provider,
      retryConfig,
    );
    logTokenUsage(agentName, result as unknown);
    return result as AIMessage;
  } catch (error) {
    // AgentError の場合は詳細をログ出力して再スロー
    if (error instanceof AgentError) {
      logger.error(`[${agentName}] ${error.toDetailedString()}`);
    }
    throw error;
  }
}

/**
 * ツール実行ループの最大反復回数
 */
const MAX_TOOL_ITERATIONS = 5;

/**
 * ツール対応モデルチェーン実行（ツール実行ループ付き）
 *
 * 1. プロンプトをメッセージに変換
 * 2. モデルにツール定義付きで送信
 * 3. モデルが tool_calls を返した場合、ツールを実行
 * 4. ツール結果を ToolMessage として会話履歴に追加
 * 5. モデルに再送信（最終回答まで繰り返し）
 *
 * 各モデル呼び出しにはリトライロジックが適用されます。
 *
 * @param agentName - エージェント名（ログ用）
 * @param modelType - モデル種別
 * @param prompt - チャットプロンプトテンプレート
 * @param input - プロンプト入力値
 * @param tools - 使用可能なツール配列
 * @returns AI応答メッセージとツール使用有無
 * @throws AgentError リトライ不可能なエラーまたは最大リトライ回数超過時
 */
export async function executeToolEnabledAgentChain<T extends Record<string, unknown>>(
  agentName: string,
  modelType: AgentRole,
  prompt: ChatPromptTemplate,
  input: T,
  tools: StructuredToolInterface[],
): Promise<{ result: AIMessage; toolCallsUsed: boolean }> {
  const model = createModel(modelType);
  const provider = getProvider(modelType);
  const retryConfig = getRetryConfig();

  logger.debug(`[${agentName}] モデル: ${model.constructor.name}`);

  // bindToolsはLangChainの標準メソッド。型チェックをバイパス
  const modelWithTools = (
    model as unknown as { bindTools: (tools: StructuredToolInterface[]) => typeof model }
  ).bindTools(tools);
  logger.debug(`[${agentName}] ツールバインディング完了: ${tools.map((t) => t.name).join(", ")}`);

  // プロンプトをメッセージに変換
  const messages: BaseMessage[] = await prompt.formatMessages(input as Record<string, unknown>);
  let toolCallsUsed = false;

  // ツール名→ツールインスタンスのマップ
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      // モデル呼び出し（リトライ付き）
      const aiMessage = await withModelRetry(
        () =>
          withSpinner(
            `[${agentName}] 思考中...${iteration > 0 ? `（ツール実行後 ${iteration}回目）` : ""}`,
            () => modelWithTools.invoke(messages),
          ),
        agentName,
        provider,
        retryConfig,
      ).then((r) => r as AIMessage);

      logTokenUsage(agentName, aiMessage as unknown);

      // tool_calls があるか確認
      const toolCalls = aiMessage.tool_calls ?? [];
      if (toolCalls.length === 0) {
        // ツールコールなし → 最終回答として返す
        return { result: aiMessage, toolCallsUsed };
      }

      // ツールコールを実行
      toolCallsUsed = true;
      logger.info(`[${agentName}] ${toolCalls.length}個のツールコールを実行します`);

      // AIメッセージを会話履歴に追加（tool_calls を含む）
      messages.push(aiMessage);

      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const toolArgs = toolCall.args;
        const toolCallId = toolCall.id ?? `call_${Date.now()}`;

        logger.info(`[${agentName}]   → ${toolName}(${JSON.stringify(toolArgs).slice(0, 200)})`);

        const tool = toolMap.get(toolName);
        if (!tool) {
          logger.warn(`[${agentName}] 未知のツール: ${toolName}`);
          messages.push(
            new ToolMessage({
              content: `エラー: ツール "${toolName}" は利用できません`,
              tool_call_id: toolCallId,
            }),
          );
          continue;
        }

        try {
          const toolResult = await tool.invoke(toolArgs);
          const resultStr =
            typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
          const truncatedResult =
            resultStr.length > 300 ? `${resultStr.slice(0, 300)}...` : resultStr;
          logger.info(`[${agentName}]   ← ${toolName}: ${truncatedResult}`);

          messages.push(
            new ToolMessage({
              content: resultStr,
              tool_call_id: toolCallId,
            }),
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`[${agentName}]   ✗ ${toolName} エラー: ${errorMsg}`);
          messages.push(
            new ToolMessage({
              content: `ツール実行エラー: ${errorMsg}`,
              tool_call_id: toolCallId,
            }),
          );
        }
      }
    }

    // 最大反復回数到達 → 最後のモデル呼び出し（ツールなし・リトライ付き）
    logger.warn(`[${agentName}] ツール実行ループが最大回数(${MAX_TOOL_ITERATIONS})に達しました`);
    const finalResult = await withModelRetry(
      () => withSpinner(`[${agentName}] 最終応答生成中...`, () => modelWithTools.invoke(messages)),
      agentName,
      provider,
      retryConfig,
    ).then((r) => r as AIMessage);
    logTokenUsage(agentName, finalResult as unknown);
    return { result: finalResult, toolCallsUsed };
  } catch (error) {
    // AgentError の場合は詳細をログ出力して再スロー
    if (error instanceof AgentError) {
      logger.error(`[${agentName}] ${error.toDetailedString()}`);
    }
    throw error;
  }
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

/**
 * ツール対応エージェントノードを生成
 *
 * 標準エージェントと同様の処理に加え、LangChainツールをモデルにバインドします。
 * ツールを使用するエージェント（Researcher等）で使用します。
 *
 * @param config - ツール対応エージェント設定オブジェクト
 * @returns LangGraphノード関数
 */
export function createToolEnabledAgent<
  TInput extends Record<string, unknown>,
  TRetryKey extends RetryKey,
  TInputSchema extends z.ZodType,
>(
  config: ToolEnabledAgentConfig<TInput, TRetryKey, TInputSchema>,
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
    tools = [],
    minOutputLength = 0,
    requireToolUse = false,
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

    // ツール使用ログ
    if (tools.length > 0) {
      logger.debug(`[${name}] 利用可能なツール: ${tools.map((t) => t.name).join(", ")}`);
    }

    // 開始ログ
    logger.info(
      `[${name}] 処理を開始します...（${attempt}回目${attempt > 1 ? "・自己ループ" : ""}）`,
    );

    // モデル実行（ツール対応・ツール実行ループ付き）
    const prompt = isRevision && revisionPrompt ? revisionPrompt : initialPrompt;
    const { result, toolCallsUsed } = await executeToolEnabledAgentChain(
      name,
      modelType,
      prompt,
      input as Record<string, unknown>,
      tools,
    );

    // レスポンス解析
    let content: string;
    if (typeof result.content === "string") {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content
        .map((item) => {
          if (typeof item === "string") return item;
          if ("text" in item && typeof item.text === "string") return item.text;
          return "";
        })
        .filter(Boolean)
        .join("\n");
    } else {
      content = JSON.stringify(result.content);
    }

    // ツール使用状況のログ
    if (tools.length > 0 && !toolCallsUsed) {
      logger.warn(`[${name}] ツールが指定されていますが、モデルはツールを呼び出しませんでした。`);
    }

    // 設定ベースの強制RETRY判定: ツールが使われず出力が短すぎる場合はRETRY
    let forceRetry = false;
    if (
      requireToolUse &&
      !toolCallsUsed &&
      tools.length > 0 &&
      minOutputLength > 0 &&
      content.length < minOutputLength
    ) {
      logger.warn(
        `[${name}] 出力が短すぎます（${content.length}文字）。ツール対応モデルの使用を推奨します。`,
      );
      forceRetry = true;
    }

    const { needRetry: parsedNeedRetry } = parseRetryResponse(content);
    // 強制RETRYが有効な場合、またはパース結果がRETRYの場合
    const needRetry = forceRetry || parsedNeedRetry;

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
