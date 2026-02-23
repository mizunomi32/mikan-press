export function buildResearchPrompt(topic: string, language: string, skillsText?: string): string {
  const skillsSection = skillsText ? `\n\n${skillsText}\n\n` : '';

  return `あなたは優秀なリサーチャーです。以下のトピックについて包括的なリサーチを行ってください。
${skillsSection}
トピック: ${topic}
出力言語: ${language === 'ja' ? '日本語' : 'English'}

以下の形式でJSONを返してください（コードブロックは不要）:
{
  "topic": "${topic}",
  "summary": "トピックの概要（200字程度）",
  "keyPoints": [
    "重要なポイント1",
    "重要なポイント2",
    "重要なポイント3",
    "重要なポイント4",
    "重要なポイント5"
  ],
  "sources": [
    "参考情報源・トレンド・背景1",
    "参考情報源・トレンド・背景2"
  ]
}

JSONのみを返してください。説明文は不要です。`;
}
