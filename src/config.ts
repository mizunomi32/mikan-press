import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { logger } from "./logger.js";

export type AgentRole =
  | "researcher"
  | "planner"
  | "writer"
  | "editor"
  | "reviewer";

interface ModelConfig {
  provider: string;
  model: string;
}

function parseModelString(value: string): ModelConfig {
  const parts = value.split("/");
  if (parts.length < 2) {
    throw new Error(
      `Invalid model format: "${value}". Expected "provider/model" (e.g. "openai/gpt-4o")`
    );
  }
  const provider = parts[0]!;
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
  const raw = process.env[ENV_KEYS[role]] ?? DEFAULTS[role]!;
  const { provider, model } = parseModelString(raw);
  logger.debug(`[Config] ${role}: provider=${provider}, model=${model}`);

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env["OPENAI_API_KEY"],
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        model,
        apiKey: process.env["GOOGLE_API_KEY"],
      });

    case "openrouter":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env["OPENROUTER_API_KEY"],
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      });

    case "glm":
      return new ChatOpenAI({
        modelName: model,
        apiKey: process.env["ZHIPU_API_KEY"],
        configuration: {
          baseURL: process.env["GLM_BASE_URL"] ?? "https://open.bigmodel.cn/api/paas/v4",
        },
      });

    default:
      throw new Error(`Unknown provider: "${provider}"`);
  }
}
