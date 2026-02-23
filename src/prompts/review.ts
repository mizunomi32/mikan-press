import type { WorkflowStage } from '../types/index';

const stageCriteria: Record<WorkflowStage, string> = {
  research: `- accuracy: 情報の正確性と信頼性
- completeness: トピックの網羅性（主要な観点がカバーされているか）
- clarity: 要約・キーポイントの明瞭さ
- coherence: 情報間の整合性`,
  plan: `- accuracy: 記事構成がトピックに適しているか
- completeness: 必要なセクションが揃っているか
- clarity: 各セクションの説明が明確か
- coherence: セクション間の流れと論理的な一貫性`,
  write: `- accuracy: 内容の正確性（リサーチ結果との整合）
- completeness: プランで計画した内容が十分に書かれているか
- clarity: 文章の読みやすさと表現の適切さ
- coherence: セクション間の繋がりと全体の一貫性`,
  edit: `- accuracy: 校正後の内容の正確性
- completeness: 記事として完成しているか
- clarity: 最終的な読みやすさと文体の統一
- coherence: 全体の構成と流れの自然さ`,
};

export function buildReviewPrompt(
  stage: WorkflowStage,
  content: string,
  language: string,
  skillsText?: string
): string {
  const lang = language === 'ja' ? '日本語' : 'English';
  const skillsSection = skillsText ? `\n\n${skillsText}\n\n` : '';

  return `あなたは記事品質のレビュアーです。以下の「${stage}」ステージの成果物を評価してください。
${skillsSection}

## 評価基準
${stageCriteria[stage]}

各項目を1〜5のスコアで評価し、全体の判定を行ってください。
- approve: 品質が十分（全スコアが3以上かつ平均3.5以上）
- revise: 改善が必要

出力言語: ${lang}

## 成果物
${content}

以下の形式でJSONのみを返してください（コードブロックは不要）:
{
  "decision": "approve" または "revise",
  "feedback": "改善点の具体的な説明（approveの場合は良い点を簡潔に）",
  "scores": {
    "accuracy": 1-5,
    "completeness": 1-5,
    "clarity": 1-5,
    "coherence": 1-5
  }
}`;
}
