import { describe, expect, test, mock, beforeEach } from 'bun:test';

// ---------- mock chat() ----------

function chatResult(content: string) {
  return { content, usage: undefined };
}

const mockChat = mock(() => Promise.resolve(chatResult('')));

mock.module('../clients/chat', () => ({
  chat: mockChat,
  resolveModel: (envVar: string, defaultSpec: string) => defaultSpec,
}));

const { ReviewAgent } = await import('../agents/ReviewAgent');

// ---------- ReviewAgent ----------

describe('ReviewAgent', () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  test('approve の JSON を正しくパースできる', async () => {
    const approveResponse = JSON.stringify({
      decision: 'approve',
      feedback: '品質が十分です。',
      scores: { accuracy: 4, completeness: 4, clarity: 5, coherence: 4 },
    });
    mockChat.mockResolvedValueOnce(chatResult(approveResponse));

    const agent = new ReviewAgent('ja');
    const result = await agent.review('research', '{"topic":"テスト"}');

    expect(result.decision).toBe('approve');
    expect(result.feedback).toBe('品質が十分です。');
    expect(result.scores.accuracy).toBe(4);
    expect(result.scores.completeness).toBe(4);
    expect(result.scores.clarity).toBe(5);
    expect(result.scores.coherence).toBe(4);
  });

  test('revise の JSON を正しくパースできる', async () => {
    const reviseResponse = JSON.stringify({
      decision: 'revise',
      feedback: '情報の網羅性が不足しています。',
      scores: { accuracy: 3, completeness: 2, clarity: 3, coherence: 3 },
    });
    mockChat.mockResolvedValueOnce(chatResult(reviseResponse));

    const agent = new ReviewAgent('ja');
    const result = await agent.review('plan', 'プランの内容');

    expect(result.decision).toBe('revise');
    expect(result.feedback).toBe('情報の網羅性が不足しています。');
    expect(result.scores.completeness).toBe(2);
  });

  test('コードフェンス付き JSON をパースできる', async () => {
    const fenced = '```json\n' + JSON.stringify({
      decision: 'approve',
      feedback: 'OK',
      scores: { accuracy: 4, completeness: 4, clarity: 4, coherence: 4 },
    }) + '\n```';
    mockChat.mockResolvedValueOnce(chatResult(fenced));

    const agent = new ReviewAgent('ja');
    const result = await agent.review('write', 'セクション内容');

    expect(result.decision).toBe('approve');
  });

  test('JSON パース失敗時は approve にフォールバック', async () => {
    mockChat.mockResolvedValueOnce(chatResult('これはJSONではありません'));

    const agent = new ReviewAgent('ja');
    const result = await agent.review('edit', '記事内容');

    expect(result.decision).toBe('approve');
    expect(result.scores.accuracy).toBe(3);
    expect(result.scores.completeness).toBe(3);
  });

  test('不正な decision の場合は approve にフォールバック', async () => {
    const invalidResponse = JSON.stringify({
      decision: 'invalid',
      feedback: 'テスト',
      scores: { accuracy: 3, completeness: 3, clarity: 3, coherence: 3 },
    });
    mockChat.mockResolvedValueOnce(chatResult(invalidResponse));

    const agent = new ReviewAgent('ja');
    const result = await agent.review('research', 'テスト');

    expect(result.decision).toBe('approve');
  });

  test('chat() に temperature=0.3 で呼び出す', async () => {
    const approveResponse = JSON.stringify({
      decision: 'approve',
      feedback: 'OK',
      scores: { accuracy: 4, completeness: 4, clarity: 4, coherence: 4 },
    });
    mockChat.mockResolvedValueOnce(chatResult(approveResponse));

    const agent = new ReviewAgent('ja');
    await agent.review('research', 'テスト');

    expect(mockChat).toHaveBeenCalledTimes(1);
    const callArgs = (mockChat.mock.calls as unknown[][])[0];
    // 3rd argument is the options object
    expect(callArgs[2]).toEqual({ temperature: 0.3 });
  });
});
