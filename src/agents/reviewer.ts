import { REVIEWER_HUMAN, REVIEWER_SYSTEM } from "@/prompts/reviewer.js";
import { createReviewerAgent, type ReviewerAgentConfig } from "@/agents/agentFactory.js";

const config: ReviewerAgentConfig = {
  name: "Reviewer",
  modelType: "reviewer",
  systemPrompt: REVIEWER_SYSTEM,
  humanPromptTemplate: REVIEWER_HUMAN,
  inputExtractor: (state) => ({
    outline: state.outline,
    editedDraft: state.editedDraft,
  }),
};

export const reviewerNode = createReviewerAgent(config);
