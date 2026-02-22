import OpenAI from 'openai';
import 'dotenv/config';

// GLM-5 is compatible with the OpenAI API format
const client = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY ?? '',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

// Default model: read from env (ZHIPU_MODEL) to support GLM-5 when available
const DEFAULT_GLM_MODEL = process.env.ZHIPU_MODEL ?? 'glm-4-flash';

export async function glmChat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number } = {}
): Promise<string> {
  const response = await client.chat.completions.create({
    model: options.model ?? DEFAULT_GLM_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content ?? '';
}
