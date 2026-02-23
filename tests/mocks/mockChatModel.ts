/**
 * LangChain BaseChatModel の簡易モック実装
 *
 * テストで予測可能な応答を返すためのモックチャットモデルです。
 */

import type { BaseChatModelParams, LanguageModelInput } from "@langchain/core/language_models/base";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessage } from "@langchain/core/messages";

export interface MockChatModelParams extends BaseChatModelParams {
  /** 返す応答のキュー（FIFO） */
  responses: string[];
  /** 応答ごとのトークン使用量（オプション） */
  usageMetadata?: Array<{
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  }>;
}

/**
 * モックチャットモデル
 *
 * 設定された応答を順番に返すシンプルな実装です。
 * トークン使用量のモックもサポートします。
 */
export class MockChatModel extends BaseChatModel {
  static lc_name() {
    return "MockChatModel";
  }

  private responsesQueue: string[];
  private usageQueue: Array<{
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  }>;

  lc_serializable = true;

  constructor(params: MockChatModelParams) {
    super(params);
    this.responsesQueue = [...params.responses];
    this.usageQueue = params.usageMetadata ? [...params.usageMetadata] : [];
  }

  /** @ignore */
  async _generate(
    _messages: LanguageModelInput,
    _options?: typeof BaseChatModel.prototype.lc_call_prefix | undefined,
  ): Promise<{ generations: Array<{ message: AIMessage }> }> {
    if (this.responsesQueue.length === 0) {
      throw new Error("No more responses in queue. Did you forget to add enough responses?");
    }

    const responseText = this.responsesQueue.shift()!;
    const usage = this.usageQueue.shift();

    const message: AIMessage = {
      content: responseText,
      // usage_metadata を設定してトークン使用量のテストを可能にする
      usage_metadata: usage,
    } as AIMessage;

    return {
      generations: [{ message }],
    };
  }

  /**
   * 次に返す応答を追加する
   */
  pushResponse(response: string, usage?: { input_tokens?: number; output_tokens?: number }): void {
    this.responsesQueue.push(response);
    if (usage) {
      this.usageQueue.push(usage);
    } else {
      this.usageQueue.push({});
    }
  }

  /**
   * 残りの応答数を取得
   */
  get remainingResponses(): number {
    return this.responsesQueue.length;
  }
}
