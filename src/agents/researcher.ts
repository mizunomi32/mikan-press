import { type AgentConfig, createStandardAgent } from "@/agents/agentFactory.js";
import { RESEARCHER_HUMAN, RESEARCHER_SYSTEM } from "@/prompts/researcher.js";
import { type ResearcherInput, researcherInputSchema } from "@/types/prompts.js";

const config: AgentConfig<ResearcherInput, "researcherRetryCount", typeof researcherInputSchema> = {
  name: "Researcher",
  modelType: "researcher",
  systemPrompt: RESEARCHER_SYSTEM,
  humanPromptTemplate: RESEARCHER_HUMAN,
  inputSchema: researcherInputSchema,
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
