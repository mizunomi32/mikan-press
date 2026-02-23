import type { Tool } from "@langchain/core/tools";
import { createToolEnabledAgent, type ToolEnabledAgentConfig } from "@/agents/agentFactory.js";
import { EDITOR_HUMAN, EDITOR_SYSTEM } from "@/prompts/editor.js";
import { textStatsTool } from "@/tools/text-stats.js";
import { urlValidatorTool } from "@/tools/url-validator.js";
import { type EditorInput, editorInputSchema } from "@/types/prompts.js";

const config: ToolEnabledAgentConfig<EditorInput, "editorRetryCount", typeof editorInputSchema> = {
  name: "Editor",
  modelType: "editor",
  systemPrompt: EDITOR_SYSTEM,
  humanPromptTemplate: EDITOR_HUMAN,
  inputSchema: editorInputSchema,
  inputExtractor: (state) => ({ draft: state.draft }),
  outputMapper: (content) => ({ editedDraft: content }),
  nextStatus: "reviewing",
  retryKey: "editorRetryCount",
  completionMessage: "編集完了",
  tools: [urlValidatorTool as unknown as Tool, textStatsTool as unknown as Tool],
};

export const editorNode = createToolEnabledAgent(config);
