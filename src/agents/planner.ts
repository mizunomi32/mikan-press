import { PLANNER_HUMAN, PLANNER_SYSTEM } from "../prompts/planner.js";
import { type AgentConfig, createStandardAgent } from "./agentFactory.js";

type PlannerInput = { topic: string; research: string };

const config: AgentConfig<PlannerInput, "plannerRetryCount"> = {
  name: "Planner",
  modelType: "planner",
  systemPrompt: PLANNER_SYSTEM,
  humanPromptTemplate: PLANNER_HUMAN,
  inputExtractor: (state) => ({
    topic: state.topic,
    research: state.research,
  }),
  outputMapper: (content) => ({ outline: content }),
  nextStatus: "writing",
  retryKey: "plannerRetryCount",
  completionMessage: "アウトライン作成完了",
};

export const plannerNode = createStandardAgent(config);
