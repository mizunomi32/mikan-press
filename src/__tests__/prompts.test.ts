import { describe, expect, test } from 'bun:test';
import { buildResearchPrompt } from '../prompts/research';
import { buildPlanPrompt } from '../prompts/plan';
import {
  buildIntroPrompt,
  buildSectionPrompt,
  buildConclusionPrompt,
} from '../prompts/writer';
import { buildEditorPrompt } from '../prompts/editor';
import type { ArticlePlan, ResearchResult, Article } from '../types/index';

// ---------- fixtures ----------

const sampleResearch: ResearchResult = {
  topic: 'TypeScriptの型システム',
  summary: 'TypeScriptは静的型付けを提供するJavaScriptのスーパーセットです。',
  keyPoints: ['型安全性', 'ジェネリクス', '型推論'],
  sources: ['公式ドキュメント', 'TypeScript Deep Dive'],
};

const samplePlan: ArticlePlan = {
  title: 'TypeScriptの型システム入門',
  introduction: '型システムの概要を紹介する',
  sections: [
    { title: '基本の型', description: '基本的な型について' },
    { title: 'ジェネリクス', description: 'ジェネリクスの活用法' },
  ],
  conclusion: 'まとめと今後の学習ステップ',
};

const sampleArticle: Article = {
  title: 'テスト記事',
  content: '',
  sections: [
    { title: '__intro', content: '導入文です。' },
    { title: '本文セクション', content: '本文の内容です。' },
    { title: '__conclusion', content: 'まとめです。' },
  ],
  metadata: {
    topic: 'テスト',
    language: 'ja',
    generatedAt: '2026-01-01T00:00:00.000Z',
    wordCount: 0,
  },
};

// ---------- buildResearchPrompt ----------

describe('buildResearchPrompt', () => {
  test('トピックが埋め込まれる', () => {
    const result = buildResearchPrompt('AI技術', 'ja');
    expect(result).toContain('AI技術');
  });

  test('日本語指定で「日本語」が含まれる', () => {
    const result = buildResearchPrompt('AI技術', 'ja');
    expect(result).toContain('日本語');
  });

  test('英語指定で「English」が含まれる', () => {
    const result = buildResearchPrompt('AI技術', 'en');
    expect(result).toContain('English');
  });
});

// ---------- buildPlanPrompt ----------

describe('buildPlanPrompt', () => {
  test('リサーチトピックが反映される', () => {
    const result = buildPlanPrompt(sampleResearch, 'ja');
    expect(result).toContain(sampleResearch.topic);
  });

  test('概要が含まれる', () => {
    const result = buildPlanPrompt(sampleResearch, 'ja');
    expect(result).toContain(sampleResearch.summary);
  });

  test('キーポイントが含まれる', () => {
    const result = buildPlanPrompt(sampleResearch, 'ja');
    for (const point of sampleResearch.keyPoints) {
      expect(result).toContain(point);
    }
  });
});

// ---------- writer prompts ----------

describe('buildIntroPrompt', () => {
  test('プランタイトルが反映される', () => {
    const result = buildIntroPrompt(samplePlan, sampleResearch, 'ja');
    expect(result).toContain(samplePlan.title);
  });

  test('導入の方向性が含まれる', () => {
    const result = buildIntroPrompt(samplePlan, sampleResearch, 'ja');
    expect(result).toContain(samplePlan.introduction);
  });

  test('リサーチ概要が含まれる', () => {
    const result = buildIntroPrompt(samplePlan, sampleResearch, 'ja');
    expect(result).toContain(sampleResearch.summary);
  });
});

describe('buildSectionPrompt', () => {
  test('セクションタイトルと説明が含まれる', () => {
    const result = buildSectionPrompt(
      '基本の型',
      '基本的な型について',
      sampleResearch,
      'ja'
    );
    expect(result).toContain('基本の型');
    expect(result).toContain('基本的な型について');
  });

  test('キーポイントが参考情報として含まれる', () => {
    const result = buildSectionPrompt(
      'テスト',
      'テスト',
      sampleResearch,
      'ja'
    );
    for (const point of sampleResearch.keyPoints) {
      expect(result).toContain(point);
    }
  });
});

describe('buildConclusionPrompt', () => {
  test('記事タイトルが含まれる', () => {
    const result = buildConclusionPrompt(samplePlan, 'ja');
    expect(result).toContain(samplePlan.title);
  });

  test('まとめの方向性が含まれる', () => {
    const result = buildConclusionPrompt(samplePlan, 'ja');
    expect(result).toContain(samplePlan.conclusion);
  });

  test('セクションタイトル一覧が含まれる', () => {
    const result = buildConclusionPrompt(samplePlan, 'ja');
    for (const s of samplePlan.sections) {
      expect(result).toContain(s.title);
    }
  });
});

// ---------- buildEditorPrompt ----------

describe('buildEditorPrompt', () => {
  test('記事タイトルが見出しとして含まれる', () => {
    const result = buildEditorPrompt(sampleArticle, 'ja');
    expect(result).toContain(`# ${sampleArticle.title}`);
  });

  test('導入文が含まれる', () => {
    const result = buildEditorPrompt(sampleArticle, 'ja');
    expect(result).toContain('導入文です。');
  });

  test('本文セクションが見出し付きで含まれる', () => {
    const result = buildEditorPrompt(sampleArticle, 'ja');
    expect(result).toContain('## 本文セクション');
    expect(result).toContain('本文の内容です。');
  });

  test('まとめが含まれる', () => {
    const result = buildEditorPrompt(sampleArticle, 'ja');
    expect(result).toContain('まとめです。');
  });

  test('__intro / __conclusion は見出しとして出力されない', () => {
    const result = buildEditorPrompt(sampleArticle, 'ja');
    expect(result).not.toContain('## __intro');
    expect(result).not.toContain('## __conclusion');
  });
});
