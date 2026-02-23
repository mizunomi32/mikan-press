import { RESEARCHER_HUMAN, RESEARCHER_SYSTEM } from "../prompts/researcher.js";
import { type AgentConfig, createStandardAgent } from "./agentFactory.js";

type ResearcherInput = { topic: string };

const config: AgentConfig<ResearcherInput, "researcherRetryCount"> = {
  name: "Researcher",
  modelType: "researcher",
  systemPrompt: RESEARCHER_SYSTEM,
  humanPromptTemplate: RESEARCHER_HUMAN,
  inputExtractor: (state) => ({ topic: state.topic }),
  outputMapper: (content) => ({ research: content }),
  nextStatus: "planning",
  retryKey: "researcherRetryCount",
  completionMessage: "リサーチ完了",
  skipCondition: (state) => state.skipResearch,
  skipResponse: {
    research: "（リサーチスキップ）",
    status: "planning",
  },
};

export const researcherNode = createStandardAgent(config);
