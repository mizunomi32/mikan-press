import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { ResearchResult, ArticlePlan } from '../types/index';

// ---------- mock chat() ----------

const mockChat = mock(() => Promise.resolve(''));

mock.module('../clients/chat', () => ({
  chat: mockChat,
  resolveModel: (envVar: string, defaultSpec: string) => defaultSpec,
}));

const { ArticleAgent } = await import('../agents/ArticleAgent');

// ---------- fixtures ----------

const researchJson: ResearchResult = {
  topic: '統合テスト',
  summary: '統合テストの概要です。',
  keyPoints: ['ポイントA', 'ポイントB'],
  sources: ['ソースX'],
};

const planJson: ArticlePlan = {
  title: '統合テスト記事',
  introduction: '導入の方向性',
  sections: [{ title: 'メインセクション', description: '内容の説明' }],
  conclusion: 'まとめの方向性',
};

// ---------- ArticleAgent 統合テスト ----------

describe('ArticleAgent', () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  test('パイプライン全体が正しく動作し Article を返す', async () => {
    // ResearchAgent
    mockChat.mockResolvedValueOnce(JSON.stringify(researchJson));

    // PlanAgent
    mockChat.mockResolvedValueOnce(JSON.stringify(planJson));

    // WriterAgent: intro + 1 section + conclusion = 3 calls
    mockChat
      .mockResolvedValueOnce('導入文の内容')
      .mockResolvedValueOnce('メインセクションの内容')
      .mockResolvedValueOnce('まとめの内容');

    // EditorAgent
    mockChat.mockResolvedValueOnce('# 統合テスト記事\n\n最終的な記事本文');

    const agent = new ArticleAgent({ topic: '統合テスト' });
    const article = await agent.run();

    expect(article.title).toBe('統合テスト記事');
    expect(article.content).toBe('# 統合テスト記事\n\n最終的な記事本文');
    expect(article.sections.length).toBe(3); // intro + 1 section + conclusion
    expect(article.metadata.topic).toBe('統合テスト');
    expect(article.metadata.language).toBe('ja');
    expect(article.metadata.wordCount).toBe(article.content.length);
    expect(article.metadata.generatedAt).toBeTruthy();
  });

  test('デフォルト設定が適用される', async () => {
    mockChat.mockResolvedValueOnce(JSON.stringify(researchJson));
    mockChat
      .mockResolvedValueOnce(JSON.stringify(planJson))
      .mockResolvedValueOnce('導入')
      .mockResolvedValueOnce('本文')
      .mockResolvedValueOnce('まとめ')
      .mockResolvedValueOnce('最終記事');

    const agent = new ArticleAgent({ topic: 'デフォルトテスト' });
    const article = await agent.run();

    // デフォルト値: language='ja'
    expect(article.metadata.language).toBe('ja');
  });

  test('英語設定で動作する', async () => {
    mockChat.mockResolvedValueOnce(JSON.stringify(researchJson));
    mockChat
      .mockResolvedValueOnce(JSON.stringify(planJson))
      .mockResolvedValueOnce('Introduction')
      .mockResolvedValueOnce('Main content')
      .mockResolvedValueOnce('Conclusion')
      .mockResolvedValueOnce('Final article in English');

    const agent = new ArticleAgent({ topic: 'English Test', language: 'en' });
    const article = await agent.run();

    expect(article.metadata.language).toBe('en');
    expect(article.content).toBe('Final article in English');
  });

  test('API 呼び出し回数が正しい', async () => {
    mockChat.mockResolvedValueOnce(JSON.stringify(researchJson));
    mockChat
      .mockResolvedValueOnce(JSON.stringify(planJson))
      .mockResolvedValueOnce('導入')
      .mockResolvedValueOnce('本文')
      .mockResolvedValueOnce('まとめ')
      .mockResolvedValueOnce('最終記事');

    const agent = new ArticleAgent({ topic: 'カウントテスト' });
    await agent.run();

    // chat() は全部で 6 回: Research(1) + Plan(1) + Writer(intro + 1section + conclusion = 3) + Editor(1)
    expect(mockChat).toHaveBeenCalledTimes(6);
  });
});
