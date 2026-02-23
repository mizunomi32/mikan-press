import type { ResearchResult } from '../types/index';

export function buildPlanPrompt(research: ResearchResult, language: string, skillsText?: string): string {
  const skillsSection = skillsText ? `\n\n${skillsText}\n\n` : '';

  return `あなたは記事構成のエキスパートです。以下のリサーチ結果を元に、読みやすい記事のアウトラインを作成してください。
${skillsSection}
## リサーチ結果
トピック: ${research.topic}
概要: ${research.summary}
キーポイント:
${research.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

出力言語: ${language === 'ja' ? '日本語' : 'English'}

以下の形式でJSONを返してください（コードブロックは不要）:
{
  "title": "記事タイトル",
  "introduction": "導入部の要旨（100字程度）",
  "sections": [
    { "title": "セクション1タイトル", "description": "このセクションで扱う内容" },
    { "title": "セクション2タイトル", "description": "このセクションで扱う内容" },
    { "title": "セクション3タイトル", "description": "このセクションで扱う内容" }
  ],
  "conclusion": "まとめの方向性"
}

JSONのみを返してください。説明文は不要です。`;
}
