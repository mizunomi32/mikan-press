import { WRITER_HUMAN, WRITER_REVISION_HUMAN, WRITER_SYSTEM } from "../prompts/writer.js";
import { type AgentConfig, createStandardAgent, type RevisionConfig } from "./agentFactory.js";

type WriterInput = {
  topic: string;
  research: string;
  outline: string;
};

type WriterRevisionInput = {
  topic: string;
  research: string;
  outline: string;
  draft: string;
  review: string;
};

const revisionConfig: RevisionConfig<WriterRevisionInput> = {
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
};

const config: AgentConfig<WriterInput, "writerRetryCount"> = {
  name: "Writer",
  modelType: "writer",
  systemPrompt: WRITER_SYSTEM,
  humanPromptTemplate: WRITER_HUMAN,
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
};

export const writerNode = createStandardAgent(config);
