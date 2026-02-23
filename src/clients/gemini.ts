import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import type { ChatMessage } from '../types/index';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

export async function geminiChat(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number } = {}
): Promise<string> {
  const modelId = options.model ?? 'gemini-2.5-flash-lite';
  const model = genAI.getGenerativeModel({ model: modelId });

  // Combine messages into a single prompt for Gemini's generateContent API
  const prompt = messages.map((m) => m.content).join('\n\n');
  const result = await model.generateContent(prompt);
  return result.response.text();
}
