import { type AgentConfig, createStandardAgent } from "@/agents/agentFactory.js";
import { PLANNER_HUMAN, PLANNER_SYSTEM } from "@/prompts/planner.js";
import { type PlannerInput, plannerInputSchema } from "@/types/prompts.js";

const config: AgentConfig<PlannerInput, "plannerRetryCount", typeof plannerInputSchema> = {
  name: "Planner",
  modelType: "planner",
  systemPrompt: PLANNER_SYSTEM,
  humanPromptTemplate: PLANNER_HUMAN,
  inputSchema: plannerInputSchema,
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
