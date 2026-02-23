/**
 * 共通テストデータ
 *
 * 複数のテストで使用する定数やヘルパー関数を提供します。
 */

/**
 * AI応答のサンプルテキスト
 */
export const sampleResponses = {
  /** PROCEEDで終わる応答 */
  proceed: "これはサンプルの応答テキストです。\n十分な品質です。PROCEED",

  /** RETRYで終わる応答 */
  retry: "これは不十分な応答です。\nもう一度やり直します。\nRETRY",

  /** 大文字小文字混合のPROCEED */
  proceedMixed: "応答内容\nProceed",

  /** 大文字小文字混合のRETRY */
  retryMixed: "応答内容\nRetry",

  /** 空白を含むRETRY */
  retryWithSpaces: "応答内容\n retry  ",

  /** 改行を含むPROCEED */
  proceedWithNewlines: "応答内容\n\nPROCEED\n",

  /** APPROVEを含むレビュー */
  approve: "APPROVE: 記事の品質は十分です。",

  /** REVISEを含むレビュー */
  revise: "REVISE: 構成を見直してください。",

  /** 長いテキスト（トークン使用量テスト用） */
  longText: "A".repeat(1000),
};

/**
 * トークン使用量のテストデータ
 */
export const tokenUsageData = {
  /** OpenAI形式のトークン使用量 */
  openAI: {
    input_tokens: 100,
    output_tokens: 50,
    total_tokens: 150,
  },

  /** Gemini形式のトークン使用量 */
  gemini: {
    prompt_tokens: 200,
    completion_tokens: 100,
    total_tokens: 300,
  },

  /** LangChain形式のトークン使用量 */
  langchain: {
    promptTokens: 150,
    completionTokens: 75,
    totalTokens: 225,
  },

  /** 一部のみの形式 */
  partial: {
    input_tokens: 80,
  },

  /** 空の形式 */
  empty: {},
};

/**
 * モデル文字列のテストデータ
 */
export const modelStrings = {
  /** 有効なOpenAIモデル */
  openAI: "openai/gpt-4o",

  /** 有効なGeminiモデル */
  gemini: "gemini/gemini-2.5-flash",

  /** 有効なOpenRouterモデル */
  openrouter: "openrouter/anthropic/claude-3.5-sonnet",

  /** 有効なGLMモデル */
  glm: "glm/glm-4-flash",

  /** スラッシュがない無効な形式 */
  invalid: "gpt-4o",

  /** 空文字列 */
  empty: "",

  /** 複数スラッシュ（OpenRouterで使用可能） */
  multiSlash: "openrouter/provider/model-name",
};

/**
 * テストデータを作成するヘルパー関数
 */
export const createTestHelpers = {
  /** 指定した長さの文字列を生成 */
  stringOfLength: (length: number): string => "x".repeat(length),

  /** 指定した数の改行を含む文字列を生成 */
  stringWithNewlines: (newlineCount: number): string => "text".concat("\n".repeat(newlineCount)),

  /** 指定したトークン使用量を持つモックレスポンスを作成 */
  mockResponseWithUsage: (
    text: string,
    usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number },
  ) => ({
    content: text,
    usage_metadata: usage,
  }),
};
