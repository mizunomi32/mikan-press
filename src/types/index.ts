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
