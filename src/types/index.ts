export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type AgentName = 'research' | 'plan' | 'writer' | 'editor' | 'review';

export interface Skill {
  name: string;
  description: string;
  agents: AgentName[];
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

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatResult {
  content: string;
  usage?: ChatUsage;
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

// Thinking loop related types
export interface Thought {
  iteration: number;
  content: string;
  skillInvoked?: string;      // 呼び出されたスキル名
  toolInvoked?: string;       // 将来のツール対応
  timestamp: string;
}

export interface SkillInvocation {
  skillName: string;
  args?: Record<string, unknown>;
}

export interface ToolInvocation {
  toolName: string;
  params: Record<string, unknown>;
}

export interface ThinkingConfig {
  maxIterations?: number;
  enableSkills?: boolean;
  enableTools?: boolean;
  skills?: Skill[];
}

export interface ThinkingResult {
  result: string;
  thoughts: Thought[];
}
