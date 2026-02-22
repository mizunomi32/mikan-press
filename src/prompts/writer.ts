import type { ArticlePlan, ResearchResult } from '../types/index';

export function buildIntroPrompt(
  plan: ArticlePlan,
  research: ResearchResult,
  language: string
): string {
  return `あなたはプロの記事ライターです。以下の情報を元に記事の導入部を執筆してください。

タイトル: ${plan.title}
導入の方向性: ${plan.introduction}
リサーチ概要: ${research.summary}
出力言語: ${language === 'ja' ? '日本語' : 'English'}

魅力的で読者を引き込む導入文を300〜400字で書いてください。見出しは不要です。本文のみ返してください。`;
}

export function buildSectionPrompt(
  sectionTitle: string,
  sectionDescription: string,
  research: ResearchResult,
  language: string
): string {
  return `あなたはプロの記事ライターです。以下のセクションを執筆してください。

セクションタイトル: ${sectionTitle}
内容の方向性: ${sectionDescription}
参考情報:
${research.keyPoints.map((p) => `- ${p}`).join('\n')}
出力言語: ${language === 'ja' ? '日本語' : 'English'}

このセクションの本文を400〜600字で書いてください。見出しは不要です。本文のみ返してください。`;
}

export function buildConclusionPrompt(
  plan: ArticlePlan,
  language: string
): string {
  return `あなたはプロの記事ライターです。以下の記事のまとめを執筆してください。

記事タイトル: ${plan.title}
まとめの方向性: ${plan.conclusion}
セクション構成:
${plan.sections.map((s) => `- ${s.title}`).join('\n')}
出力言語: ${language === 'ja' ? '日本語' : 'English'}

読者への行動喚起を含む、まとめの文章を200〜300字で書いてください。見出しは不要です。本文のみ返してください。`;
}
