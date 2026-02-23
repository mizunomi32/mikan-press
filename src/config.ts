import "dotenv/config";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { logger } from "@/logger.js";
import type { RetryConfig } from "@/utils/retry.js";

export type AgentRole = "researcher" | "planner" | "writer" | "editor" | "reviewer";

interface ModelConfig {
  provider: string;
  model: string;
}

function parseModelString(value: string): ModelConfig {
  const parts = value.split("/");
  if (parts.length < 2) {
    throw new Error(
      `Invalid model format: "${value}". Expected "provider/model" (e.g. "openai/gpt-4o")`,
    );
  }
  const provider = parts[0] ?? "openai";
  const model = parts.slice(1).join("/");
  return { provider, model };
}

const ENV_KEYS: Record<AgentRole, string> = {
  researcher: "RESEARCHER_MODEL",
  planner: "PLANNER_MODEL",
  writer: "WRITER_MODEL",
  editor: "EDITOR_MODEL",
  reviewer: "REVIEWER_MODEL",
};

const DEFAULTS: Record<AgentRole, string> = {
  researcher: "openai/gpt-4o",
  planner: "openai/gpt-4o",
  writer: "openai/gpt-4o",
  editor: "openai/gpt-4o",
  reviewer: "openai/gpt-4o",
};

export function createModel(role: AgentRole): BaseChatModel {
  const raw = process.env[ENV_KEYS[role]] ?? DEFAULTS[role];
  const { provider, model } = parseModelString(raw);
  logger.debug(`[Config] ${role}: provider=${provider}, model=${model}`);

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env.OPENAI_API_KEY,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        model,
        apiKey: process.env.GOOGLE_API_KEY,
      });

    case "openrouter":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      });

    case "glm":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env.ZHIPU_API_KEY,
        configuration: {
          baseURL: process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
        },
      });

    default:
      throw new Error(`Unknown provider: "${provider}"`);
  }
}

// ============================================================================
// リトライ設定
// ============================================================================

/**
 * デフォルトのリトライ設定
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

/**
 * 環境変数からリトライ設定を取得
 *
 * 環境変数:
 * - MAX_RETRIES: 最大リトライ回数（デフォルト: 3）
 * - RETRY_INITIAL_DELAY_MS: 初期待機時間（デフォルト: 1000）
 * - RETRY_MAX_DELAY_MS: 最大待機時間（デフォルト: 30000）
 * - RETRY_BACKOFF_FACTOR: バックオフ係数（デフォルト: 2）
 *
 * @returns リトライ設定
 */
export function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.MAX_RETRIES ?? "3", 10),
    initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS ?? "1000", 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS ?? "30000", 10),
    backoffFactor: parseFloat(process.env.RETRY_BACKOFF_FACTOR ?? "2"),
  };
}

/**
 * 指定されたロールのプロバイダー名を取得
 *
 * @param role - エージェントロール
 * @returns プロバイダー名（openai/gemini/openrouter/glm）
 */
export function getProvider(role: AgentRole): string {
  const raw = process.env[ENV_KEYS[role]] ?? DEFAULTS[role];
  const { provider } = parseModelString(raw);
  return provider;
}
