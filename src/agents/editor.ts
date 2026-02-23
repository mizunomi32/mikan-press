import {
  createStandardAgent,
  type AgentConfig,
} from "./agentFactory.js";
import { EDITOR_SYSTEM, EDITOR_HUMAN } from "../prompts/editor.js";
import { ArticleState } from "../state.js";

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
