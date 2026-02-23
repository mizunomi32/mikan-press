import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { ResearchResult, ArticlePlan, ReviewResult } from '../types/index';

// ---------- mock chat() ----------

function chatResult(content: string) {
  return { content, usage: undefined };
}

const mockChat = mock(() => Promise.resolve(chatResult('')));

mock.module('../clients/chat', () => ({
  chat: mockChat,
  resolveModel: (envVar: string, defaultSpec: string) => defaultSpec,
}));

const { SupervisorAgent } = await import('../agents/SupervisorAgent');
const { ReviewAgent } = await import('../agents/ReviewAgent');

// ---------- fixtures ----------

const researchJson: ResearchResult = {
  topic: 'テスト',
  summary: 'テストの概要です。',
  keyPoints: ['ポイントA', 'ポイントB'],
  sources: ['ソースX'],
};

const planJson: ArticlePlan = {
  title: 'テスト記事',
  introduction: '導入の方向性',
  sections: [{ title: 'メインセクション', description: '内容の説明' }],
  conclusion: 'まとめの方向性',
};

const approveResult: ReviewResult = {
  decision: 'approve',
  feedback: '品質が十分です。',
  scores: { accuracy: 4, completeness: 4, clarity: 4, coherence: 4 },
};

const reviseResult: ReviewResult = {
  decision: 'revise',
  feedback: '情報が不足しています。以下を追加してください。',
  scores: { accuracy: 2, completeness: 2, clarity: 3, coherence: 3 },
};

// ---------- mock ReviewAgent ----------

function createMockReviewAgent(reviewSequence: ReviewResult[]): InstanceType<typeof ReviewAgent> {
  let callIndex = 0;
  const agent = new ReviewAgent('ja');
  agent.review = mock(async () => {
    const result = reviewSequence[callIndex] ?? approveResult;
    callIndex++;
    return result;
  }) as typeof agent.review;
  return agent;
}

// ---------- helper: setup standard mocks for a full pipeline run ----------

function setupFullPipelineMocks() {
  // ResearchAgent
  mockChat.mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)));
  // PlanAgent
  mockChat.mockResolvedValueOnce(chatResult(JSON.stringify(planJson)));
  // WriterAgent: intro + 1 section + conclusion = 3 calls
  mockChat
    .mockResolvedValueOnce(chatResult('導入文の内容'))
    .mockResolvedValueOnce(chatResult('メインセクションの内容'))
    .mockResolvedValueOnce(chatResult('まとめの内容'));
  // EditorAgent
  mockChat.mockResolvedValueOnce(chatResult('# テスト記事\n\n最終的な記事本文'));
}

// ---------- SupervisorAgent ----------

describe('SupervisorAgent', () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  test('全ステージ approve で正常に Article を返す', async () => {
    setupFullPipelineMocks();

    // 4 stages, all approve
    const mockReview = createMockReviewAgent([
      approveResult,
      approveResult,
      approveResult,
      approveResult,
    ]);

    const agent = new SupervisorAgent({ topic: 'テスト' }, mockReview);
    const article = await agent.run();

    expect(article.title).toBe('テスト記事');
    expect(article.content).toBe('# テスト記事\n\n最終的な記事本文');
    expect(article.sections.length).toBe(3);
    expect(article.metadata.topic).toBe('テスト');
    expect(article.metadata.language).toBe('ja');

    // ReviewAgent は 4 回呼ばれる（各ステージ1回）
    expect(mockReview.review).toHaveBeenCalledTimes(4);
  });

  test('revise → approve パターンでリトライが動作する', async () => {
    // Research: 1回目 + リトライ1回 = 2回
    mockChat
      .mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)))
      .mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)));

    // Plan, Writer, Editor は各1回
    mockChat.mockResolvedValueOnce(chatResult(JSON.stringify(planJson)));
    mockChat
      .mockResolvedValueOnce(chatResult('導入文の内容'))
      .mockResolvedValueOnce(chatResult('メインセクションの内容'))
      .mockResolvedValueOnce(chatResult('まとめの内容'));
    mockChat.mockResolvedValueOnce(chatResult('# テスト記事\n\n最終記事'));

    // research: revise → approve, others: approve
    const mockReview = createMockReviewAgent([
      reviseResult,   // research 1回目 → revise
      approveResult,  // research 2回目 → approve
      approveResult,  // plan
      approveResult,  // write
      approveResult,  // edit
    ]);

    const agent = new SupervisorAgent({ topic: 'テスト', maxRetries: 2 }, mockReview);
    const article = await agent.run();

    expect(article.content).toBe('# テスト記事\n\n最終記事');
    // ReviewAgent は 5 回呼ばれる（research 2回 + 残り3回）
    expect(mockReview.review).toHaveBeenCalledTimes(5);
    // chat() は research 2回 + plan 1回 + writer 3回 + editor 1回 = 7回
    expect(mockChat).toHaveBeenCalledTimes(7);
  });

  test('maxRetries 到達時は現在の結果で続行する', async () => {
    // Research: 3回実行（初回 + リトライ2回）
    mockChat
      .mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)))
      .mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)))
      .mockResolvedValueOnce(chatResult(JSON.stringify(researchJson)));

    // Plan, Writer, Editor
    mockChat.mockResolvedValueOnce(chatResult(JSON.stringify(planJson)));
    mockChat
      .mockResolvedValueOnce(chatResult('導入文'))
      .mockResolvedValueOnce(chatResult('本文'))
      .mockResolvedValueOnce(chatResult('まとめ'));
    mockChat.mockResolvedValueOnce(chatResult('最終記事'));

    // research: 3回とも revise, others: approve
    const mockReview = createMockReviewAgent([
      reviseResult,   // research 1回目
      reviseResult,   // research 2回目
      reviseResult,   // research 3回目（maxRetries到達、この結果で続行）
      approveResult,  // plan
      approveResult,  // write
      approveResult,  // edit
    ]);

    const agent = new SupervisorAgent({ topic: 'テスト', maxRetries: 2 }, mockReview);
    const article = await agent.run();

    // maxRetries 到達でも記事は生成される
    expect(article.content).toBe('最終記事');
    expect(article.metadata.wordCount).toBe(4);
    // ReviewAgent: research 3回 + 残り3回 = 6回
    expect(mockReview.review).toHaveBeenCalledTimes(6);
  });

  test('maxRetries=0 でレビューはするが差し戻しはしない', async () => {
    setupFullPipelineMocks();

    // 全部 revise でも差し戻しなし
    const mockReview = createMockReviewAgent([
      reviseResult,
      reviseResult,
      reviseResult,
      reviseResult,
    ]);

    const agent = new SupervisorAgent({ topic: 'テスト', maxRetries: 0 }, mockReview);
    const article = await agent.run();

    expect(article.title).toBe('テスト記事');
    // 各ステージ1回ずつ実行（リトライなし）: research(1) + plan(1) + writer(3) + editor(1) = 6
    expect(mockChat).toHaveBeenCalledTimes(6);
    // ReviewAgent は 4 回呼ばれる
    expect(mockReview.review).toHaveBeenCalledTimes(4);
  });

  test('SKIP_RESEARCH=true でリサーチをスキップする', async () => {
    const originalEnv = process.env.SKIP_RESEARCH;
    process.env.SKIP_RESEARCH = 'true';

    try {
      // ResearchAgent の chat() 呼び出しはスキップされる
      // PlanAgent
      mockChat.mockResolvedValueOnce(chatResult(JSON.stringify(planJson)));
      // WriterAgent: intro + 1 section + conclusion = 3 calls
      mockChat
        .mockResolvedValueOnce(chatResult('導入文の内容'))
        .mockResolvedValueOnce(chatResult('メインセクションの内容'))
        .mockResolvedValueOnce(chatResult('まとめの内容'));
      // EditorAgent
      mockChat.mockResolvedValueOnce(chatResult('# テスト記事\n\nスキップ記事'));

      // research のレビューは不要なので 3 回（plan, write, edit）
      const mockReview = createMockReviewAgent([
        approveResult,
        approveResult,
        approveResult,
      ]);

      const agent = new SupervisorAgent({ topic: 'テスト' }, mockReview);
      const article = await agent.run();

      expect(article.title).toBe('テスト記事');
      expect(article.content).toBe('# テスト記事\n\nスキップ記事');
      // chat() は plan(1) + writer(3) + editor(1) = 5 回（research の 1 回がない）
      expect(mockChat).toHaveBeenCalledTimes(5);
      // ReviewAgent は 3 回（research のレビューなし）
      expect(mockReview.review).toHaveBeenCalledTimes(3);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.SKIP_RESEARCH;
      } else {
        process.env.SKIP_RESEARCH = originalEnv;
      }
    }
  });

  test('デフォルト設定が正しく適用される', async () => {
    setupFullPipelineMocks();

    const mockReview = createMockReviewAgent([
      approveResult,
      approveResult,
      approveResult,
      approveResult,
    ]);

    const agent = new SupervisorAgent({ topic: 'デフォルト' }, mockReview);
    const article = await agent.run();

    expect(article.metadata.language).toBe('ja');
  });
});
