import {
  createReviewerAgent,
  type ReviewerAgentConfig,
} from "./agentFactory.js";
import { REVIEWER_SYSTEM, REVIEWER_HUMAN } from "../prompts/reviewer.js";
import { ArticleState } from "../state.js";

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
