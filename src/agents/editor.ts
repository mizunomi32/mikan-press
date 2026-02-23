import { EDITOR_HUMAN, EDITOR_SYSTEM } from "../prompts/editor.js";
import { type AgentConfig, createStandardAgent } from "./agentFactory.js";

type EditorInput = { draft: string };

const config: AgentConfig<EditorInput, "editorRetryCount"> = {
  name: "Editor",
  modelType: "editor",
  systemPrompt: EDITOR_SYSTEM,
  humanPromptTemplate: EDITOR_HUMAN,
  inputExtractor: (state) => ({ draft: state.draft }),
  outputMapper: (content) => ({ editedDraft: content }),
  nextStatus: "reviewing",
  retryKey: "editorRetryCount",
  completionMessage: "編集完了",
};

export const editorNode = createStandardAgent(config);
