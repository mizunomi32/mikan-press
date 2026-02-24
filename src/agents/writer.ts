import {
  createToolEnabledAgent,
  type RevisionConfig,
  type ToolEnabledAgentConfig,
} from "@/agents/agentFactory.js";
import { WRITER_HUMAN, WRITER_REVISION_HUMAN, WRITER_SYSTEM } from "@/prompts/writer.js";
import { dateTimeTool } from "@/tools/datetime.js";
import {
  type WriterInput,
  type WriterRevisionInput,
  writerInputSchema,
  writerRevisionInputSchema,
} from "@/types/prompts.js";

const revisionConfig: RevisionConfig<WriterRevisionInput, typeof writerRevisionInputSchema> = {
  humanPromptTemplate: WRITER_REVISION_HUMAN,
  inputExtractor: (state) => ({
    topic: state.topic,
    research: state.research,
    outline: state.outline,
    draft: state.editedDraft || state.draft,
    review: state.review,
  }),
  completionMessage: "改稿完了",
  condition: (state) => !!state.review,
  inputSchema: writerRevisionInputSchema,
};

const config: ToolEnabledAgentConfig<WriterInput, "writerRetryCount", typeof writerInputSchema> = {
  name: "Writer",
  modelType: "writer",
  systemPrompt: WRITER_SYSTEM,
  humanPromptTemplate: WRITER_HUMAN,
  inputSchema: writerInputSchema,
  inputExtractor: (state) => ({
    topic: state.topic,
    research: state.research,
    outline: state.outline,
  }),
  outputMapper: (content) => ({ draft: content }),
  nextStatus: "editing",
  retryKey: "writerRetryCount",
  completionMessage: "初稿完了",
  revisionConfig,
  tools: [dateTimeTool],
};

export const writerNode = createToolEnabledAgent(config);
