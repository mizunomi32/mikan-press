export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type Provider = 'google' | 'zhipu' | 'openai' | 'openrouter';

export interface ModelSpec {
  provider: Provider;
  model: string;
}

export interface ArticleConfig {
  topic: string;
  language?: 'ja' | 'en';
  maxLength?: number;
  output?: string;
}

export interface ResearchResult {
  topic: string;
  summary: string;
  keyPoints: string[];
  sources: string[];
}

export interface ArticleSection {
  title: string;
  content: string;
}

export interface ArticlePlan {
  title: string;
  introduction: string;
  sections: Array<{ title: string; description: string }>;
  conclusion: string;
}

export interface Article {
  title: string;
  content: string;
  sections: ArticleSection[];
  metadata: {
    topic: string;
    language: string;
    generatedAt: string;
    wordCount: number;
  };
}

export type WorkflowStage = 'research' | 'plan' | 'write' | 'edit';

export interface ReviewResult {
  decision: 'approve' | 'revise';
  feedback: string;
  scores: { accuracy: number; completeness: number; clarity: number; coherence: number };
}

export interface WorkflowState {
  stage: WorkflowStage | 'done';
  research?: ResearchResult;
  plan?: ArticlePlan;
  sections?: ArticleSection[];
  finalContent?: string;
  retries: Record<WorkflowStage, number>;
  reviewHistory: Array<{ stage: WorkflowStage; result: ReviewResult; attempt: number }>;
}

export interface SupervisorConfig extends ArticleConfig {
  maxRetries?: number;
}
