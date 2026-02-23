import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { getEnv, parseModelString } from "@/env.js";
import { logger } from "@/logger.js";

export type AgentRole = "researcher" | "planner" | "writer" | "editor" | "reviewer";

const ENV_KEYS: Record<AgentRole, keyof ReturnType<typeof getEnv>> = {
  researcher: "RESEARCHER_MODEL",
  planner: "PLANNER_MODEL",
  writer: "WRITER_MODEL",
  editor: "EDITOR_MODEL",
  reviewer: "REVIEWER_MODEL",
};

export function createModel(role: AgentRole): BaseChatModel {
  const env = getEnv();
  const raw = env[ENV_KEYS[role]] as string;
  const { provider, model } = parseModelString(raw);
  logger.debug(`[Config] ${role}: provider=${provider}, model=${model}`);

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        apiKey: env.OPENAI_API_KEY,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        model,
        apiKey: env.GOOGLE_API_KEY,
      });

    case "openrouter":
      return new ChatOpenAI({
        modelName: model,
        apiKey: env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      });

    case "glm":
      return new ChatOpenAI({
        modelName: model,
        apiKey: env.ZHIPU_API_KEY,
        configuration: {
          baseURL: env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
        },
      });

    default:
      throw new Error(`Unknown provider: "${provider}"`);
  }
}
