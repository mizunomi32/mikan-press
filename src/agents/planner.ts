import {
  createStandardAgent,
  type AgentConfig,
} from "./agentFactory.js";
import { PLANNER_SYSTEM, PLANNER_HUMAN } from "../prompts/planner.js";
import { ArticleState } from "../state.js";

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
