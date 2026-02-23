import { createReviewerAgent, type ReviewerAgentConfig } from "@/agents/agentFactory.js";
import { REVIEWER_HUMAN, REVIEWER_SYSTEM } from "@/prompts/reviewer.js";
import { reviewerInputSchema } from "@/types/prompts.js";

const config: ReviewerAgentConfig<typeof reviewerInputSchema> = {
  name: "Reviewer",
  modelType: "reviewer",
  systemPrompt: REVIEWER_SYSTEM,
  humanPromptTemplate: REVIEWER_HUMAN,
  inputSchema: reviewerInputSchema,
  inputExtractor: (state) => ({
    outline: state.outline,
    editedDraft: state.editedDraft,
  }),
};

export const reviewerNode = createReviewerAgent(config);
