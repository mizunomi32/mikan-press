import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

export async function geminiChat(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
