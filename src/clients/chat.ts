import type { ChatMessage, ChatResult } from '../types/index';
import { parseModelSpec } from './model';
import { geminiChat } from './gemini';
import { glmChat } from './glm';
import { openaiChat } from './openai';
import { openrouterChat } from './openrouter';
import { logger } from '../logger';

export { parseModelSpec, resolveModel } from './model';

export interface ChatOptions {
  temperature?: number;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export async function chat(
  spec: string,
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ChatResult> {
  const { provider, model } = parseModelSpec(spec);

  logger.debug(`[chat] >>> ${spec}`);
  for (const m of messages) {
    logger.debug(`[chat]   [${m.role}] ${truncate(m.content, 200)}`);
  }

  let result: ChatResult;
  switch (provider) {
    case 'google':
      result = await geminiChat(messages, { model, temperature: options?.temperature });
      break;
    case 'zhipu':
      result = await glmChat(messages, { model, temperature: options?.temperature });
      break;
    case 'openai':
      result = await openaiChat(messages, { model, temperature: options?.temperature });
      break;
    case 'openrouter':
      result = await openrouterChat(messages, { model, temperature: options?.temperature });
      break;
    default:
      throw new Error(`Unknown provider "${provider}". Supported: google, zhipu, openai, openrouter`);
  }

  logger.debug(`[chat] <<< ${spec}`);
  logger.debug(`[chat]   response: ${truncate(result.content, 200)}`);
  if (result.usage) {
    logger.debug(
      `[chat]   tokens: prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}`
    );
  }

  return result;
}
