import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { ResearchResult, ArticlePlan } from '../types/index';

// ---------- mock API clients ----------

const mockGeminiChat = mock(() => Promise.resolve(''));
const mockGlmChat = mock(() => Promise.resolve(''));

mock.module('../clients/gemini', () => ({
  geminiChat: mockGeminiChat,
}));

mock.module('../clients/glm', () => ({
  glmChat: mockGlmChat,
}));

// import AFTER mock.module so mocks take effect
const { ResearchAgent } = await import('../agents/ResearchAgent');
const { PlanAgent } = await import('../agents/PlanAgent');
const { WriterAgent } = await import('../agents/WriterAgent');
const { EditorAgent } = await import('../agents/EditorAgent');

// ---------- fixtures ----------

const validResearchJson: ResearchResult = {
  topic: 'テスト',
  summary: 'テストの概要',
  keyPoints: ['ポイント1', 'ポイント2'],
  sources: ['ソース1'],
};

const validPlanJson: ArticlePlan = {
  title: 'テスト記事のタイトル',
  introduction: '導入の方向性',
  sections: [
    { title: 'セクション1', description: '内容1' },
    { title: 'セクション2', description: '内容2' },
  ],
  conclusion: 'まとめの方向性',
};

// ---------- ResearchAgent ----------

describe('ResearchAgent', () => {
  beforeEach(() => {
    mockGeminiChat.mockReset();
  });

  test('正常な JSON をパースできる', async () => {
    mockGeminiChat.mockResolvedValueOnce(JSON.stringify(validResearchJson));
    const agent = new ResearchAgent('ja');
    const result = await agent.run('テスト');

    expect(result.topic).toBe('テスト');
    expect(result.summary).toBe('テストの概要');
    expect(result.keyPoints).toEqual(['ポイント1', 'ポイント2']);
  });

  test('コードフェンス付き JSON をパースできる', async () => {
    const fenced = '```json\n' + JSON.stringify(validResearchJson) + '\n```';
    mockGeminiChat.mockResolvedValueOnce(fenced);
    const agent = new ResearchAgent('ja');
    const result = await agent.run('テスト');

    expect(result.topic).toBe('テスト');
    expect(result.keyPoints.length).toBe(2);
  });

  test('不正な文字列でフォールバック構造を返す', async () => {
    mockGeminiChat.mockResolvedValueOnce('これはJSONではありません');
    const agent = new ResearchAgent('ja');
    const result = await agent.run('テスト');

    expect(result.topic).toBe('テスト');
    expect(result.keyPoints).toEqual([]);
    expect(result.sources).toEqual([]);
    // summary はフォールバックで raw の先頭 300 字
    expect(result.summary).toBe('これはJSONではありません');
  });
});

// ---------- PlanAgent ----------

describe('PlanAgent', () => {
  beforeEach(() => {
    mockGlmChat.mockReset();
  });

  test('正常な JSON をパースできる', async () => {
    mockGlmChat.mockResolvedValueOnce(JSON.stringify(validPlanJson));
    const agent = new PlanAgent('ja');
    const result = await agent.run(validResearchJson);

    expect(result.title).toBe('テスト記事のタイトル');
    expect(result.sections.length).toBe(2);
  });

  test('コードフェンス付き JSON をパースできる', async () => {
    const fenced = '```\n' + JSON.stringify(validPlanJson) + '\n```';
    mockGlmChat.mockResolvedValueOnce(fenced);
    const agent = new PlanAgent('ja');
    const result = await agent.run(validResearchJson);

    expect(result.title).toBe('テスト記事のタイトル');
  });

  test('不正な文字列でフォールバック構造を返す', async () => {
    mockGlmChat.mockResolvedValueOnce('パースできない文字列');
    const agent = new PlanAgent('ja');
    const result = await agent.run(validResearchJson);

    expect(result.title).toBe('テスト');
    expect(result.sections.length).toBe(3);
    expect(result.conclusion).toBe('まとめ');
  });
});

// ---------- WriterAgent ----------

describe('WriterAgent', () => {
  beforeEach(() => {
    mockGlmChat.mockReset();
  });

  test('intro + body sections + conclusion を返す', async () => {
    // intro, section1, section2, conclusion の 4 回呼ばれる
    mockGlmChat
      .mockResolvedValueOnce('導入文の内容')
      .mockResolvedValueOnce('セクション1の内容')
      .mockResolvedValueOnce('セクション2の内容')
      .mockResolvedValueOnce('まとめの内容');

    const agent = new WriterAgent('ja');
    const result = await agent.run(validPlanJson, validResearchJson);

    expect(result.length).toBe(4);
    expect(result[0].title).toBe('__intro');
    expect(result[0].content).toBe('導入文の内容');
    expect(result[1].title).toBe('セクション1');
    expect(result[2].title).toBe('セクション2');
    expect(result[3].title).toBe('__conclusion');
    expect(result[3].content).toBe('まとめの内容');
  });

  test('レスポンスの前後空白が除去される', async () => {
    mockGlmChat
      .mockResolvedValueOnce('  導入文  ')
      .mockResolvedValueOnce(' 本文1 ')
      .mockResolvedValueOnce(' 本文2 ')
      .mockResolvedValueOnce('  まとめ  ');

    const agent = new WriterAgent('ja');
    const result = await agent.run(validPlanJson, validResearchJson);

    expect(result[0].content).toBe('導入文');
    expect(result[3].content).toBe('まとめ');
  });
});

// ---------- EditorAgent ----------

describe('EditorAgent', () => {
  beforeEach(() => {
    mockGlmChat.mockReset();
  });

  test('校正結果を返す', async () => {
    mockGlmChat.mockResolvedValueOnce('  校正済みの記事本文  ');
    const agent = new EditorAgent('ja');
    const article = {
      title: 'テスト',
      content: '',
      sections: [{ title: '__intro', content: '導入' }],
      metadata: {
        topic: 'テスト',
        language: 'ja',
        generatedAt: '2026-01-01T00:00:00.000Z',
        wordCount: 0,
      },
    };
    const result = await agent.run(article);

    expect(result).toBe('校正済みの記事本文');
  });
});
