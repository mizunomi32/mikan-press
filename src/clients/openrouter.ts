import OpenAI from 'openai';
import 'dotenv/config';
import type { ChatMessage, ChatResult } from '../types/index';

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  baseURL: 'https://openrouter.ai/api/v1',
});

export async function openrouterChat(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number } = {}
): Promise<ChatResult> {
  const response = await client.chat.completions.create({
    model: options.model ?? 'openai/gpt-4o',
    messages,
    temperature: options.temperature ?? 0.7,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}
