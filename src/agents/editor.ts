import { type AgentConfig, createStandardAgent } from "@/agents/agentFactory.js";
import { EDITOR_HUMAN, EDITOR_SYSTEM } from "@/prompts/editor.js";
import { type EditorInput, editorInputSchema } from "@/types/prompts.js";

const config: AgentConfig<EditorInput, "editorRetryCount", typeof editorInputSchema> = {
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
};

export const editorNode = createStandardAgent(config);
