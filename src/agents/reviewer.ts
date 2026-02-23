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
    topic: state.topic,
    outline: state.outline,
    draft: state.draft,
    editedDraft: state.editedDraft,
    reviewCount: state.reviewCount ?? 0,
    maxReviews: state.maxReviews ?? 3,
  }),
};

export const reviewerNode = createReviewerAgent(config);
