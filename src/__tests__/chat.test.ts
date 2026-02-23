import { describe, expect, test } from 'bun:test';
import { parseModelSpec, resolveModel } from '../clients/model';

// ---------- parseModelSpec ----------

describe('parseModelSpec', () => {
  test('provider/model を正しくパースする', () => {
    const result = parseModelSpec('google/gemini-2.5-flash-lite');
    expect(result).toEqual({ provider: 'google', model: 'gemini-2.5-flash-lite' });
  });

  test('zhipu/glm-4-flash をパースする', () => {
    const result = parseModelSpec('zhipu/glm-4-flash');
    expect(result).toEqual({ provider: 'zhipu', model: 'glm-4-flash' });
  });

  test('openrouter のスラッシュを含むモデル名を正しくパースする', () => {
    const result = parseModelSpec('openrouter/anthropic/claude-sonnet-4');
    expect(result).toEqual({ provider: 'openrouter', model: 'anthropic/claude-sonnet-4' });
  });

  test('openai/gpt-4o をパースする', () => {
    const result = parseModelSpec('openai/gpt-4o');
    expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  test('スラッシュなしの文字列でエラーを投げる', () => {
    expect(() => parseModelSpec('invalid')).toThrow('Invalid model spec');
  });

  test('空文字列でエラーを投げる', () => {
    expect(() => parseModelSpec('')).toThrow('Invalid model spec');
  });
});

// ---------- resolveModel ----------

describe('resolveModel', () => {
  test('環境変数が設定されていればその値を返す', () => {
    const origVal = process.env.TEST_CHAT_RESOLVE;
    process.env.TEST_CHAT_RESOLVE = 'openai/gpt-4o';
    try {
      const result = resolveModel('TEST_CHAT_RESOLVE', 'google/gemini-2.5-flash-lite');
      expect(result).toBe('openai/gpt-4o');
    } finally {
      if (origVal === undefined) delete process.env.TEST_CHAT_RESOLVE;
      else process.env.TEST_CHAT_RESOLVE = origVal;
    }
  });

  test('環境変数が未設定ならデフォルト値を返す', () => {
    delete process.env.TEST_CHAT_RESOLVE_UNSET;
    const result = resolveModel('TEST_CHAT_RESOLVE_UNSET', 'google/gemini-2.5-flash-lite');
    expect(result).toBe('google/gemini-2.5-flash-lite');
  });
});
