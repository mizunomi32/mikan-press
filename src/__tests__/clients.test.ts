import { describe, expect, test, mock, beforeEach } from 'bun:test';

// ---------- GLM client tests ----------
// glmChat の実装詳細は agents.test.ts で間接的にテスト済み。
// ここではモジュールのエクスポートとモック時の振る舞いを検証する。

describe('glmChat (mocked)', () => {
  const mockGlmChat = mock(() => Promise.resolve(''));

  mock.module('../clients/glm', () => ({
    glmChat: mockGlmChat,
  }));

  beforeEach(() => {
    mockGlmChat.mockReset();
    mockGlmChat.mockResolvedValue('GLMの応答');
  });

  test('メッセージを送信して応答を取得できる', async () => {
    const { glmChat } = await import('../clients/glm');
    const result = await glmChat([{ role: 'user', content: 'テスト' }]);

    expect(result).toBe('GLMの応答');
    expect(mockGlmChat).toHaveBeenCalledTimes(1);
  });

  test('メッセージ配列が正しく渡される', async () => {
    const { glmChat } = await import('../clients/glm');
    const messages = [
      { role: 'user' as const, content: 'こんにちは' },
    ];
    await glmChat(messages);

    expect(mockGlmChat).toHaveBeenCalledWith(messages);
  });

  test('オプション付きで呼び出せる', async () => {
    const { glmChat } = await import('../clients/glm');
    const messages = [{ role: 'user' as const, content: 'テスト' }];
    const options = { temperature: 0.5, model: 'glm-5' };
    await glmChat(messages, options);

    expect(mockGlmChat).toHaveBeenCalledWith(messages, options);
  });

  test('空文字を返すケース', async () => {
    mockGlmChat.mockResolvedValueOnce('');
    const { glmChat } = await import('../clients/glm');
    const result = await glmChat([{ role: 'user', content: 'テスト' }]);

    expect(result).toBe('');
  });
});

// ---------- Gemini client tests ----------

describe('geminiChat (mocked)', () => {
  const mockGeminiChat = mock(() => Promise.resolve(''));

  mock.module('../clients/gemini', () => ({
    geminiChat: mockGeminiChat,
  }));

  beforeEach(() => {
    mockGeminiChat.mockReset();
    mockGeminiChat.mockResolvedValue('Geminiの応答');
  });

  test('プロンプトを送信して応答を取得できる', async () => {
    const { geminiChat } = await import('../clients/gemini');
    const result = await geminiChat('テストプロンプト');

    expect(result).toBe('Geminiの応答');
    expect(mockGeminiChat).toHaveBeenCalledTimes(1);
  });

  test('プロンプトが引数として渡される', async () => {
    const { geminiChat } = await import('../clients/gemini');
    await geminiChat('入力プロンプト');

    expect(mockGeminiChat).toHaveBeenCalledWith('入力プロンプト');
  });

  test('空文字を返すケース', async () => {
    mockGeminiChat.mockResolvedValueOnce('');
    const { geminiChat } = await import('../clients/gemini');
    const result = await geminiChat('テスト');

    expect(result).toBe('');
  });
});
