import type { ChatMessage } from '../types/index';
import { parseModelSpec } from './model';
import { geminiChat } from './gemini';
import { glmChat } from './glm';
import { openaiChat } from './openai';
import { openrouterChat } from './openrouter';

export { parseModelSpec, resolveModel } from './model';

export interface ChatOptions {
  temperature?: number;
}

export async function chat(
  spec: string,
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const { provider, model } = parseModelSpec(spec);

  switch (provider) {
    case 'google':
      return geminiChat(messages, { model, temperature: options?.temperature });
    case 'zhipu':
      return glmChat(messages, { model, temperature: options?.temperature });
    case 'openai':
      return openaiChat(messages, { model, temperature: options?.temperature });
    case 'openrouter':
      return openrouterChat(messages, { model, temperature: options?.temperature });
    default:
      throw new Error(`Unknown provider "${provider}". Supported: google, zhipu, openai, openrouter`);
  }
}
