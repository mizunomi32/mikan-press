/**
 * 進捗管理モジュール
 *
 * 記事生成の進捗を可視化します。
 */

/** エージェント名の型 */
export type AgentName = "researcher" | "planner" | "writer" | "editor" | "reviewer";

/** エージェントの日本語名 */
const AGENT_LABELS: Record<AgentName, string> = {
  researcher: "リサーチャー",
  planner: "プランナー",
  writer: "ライター",
  editor: "エディター",
  reviewer: "レビュアー",
};

/** ワークフローのステージ定義 */
interface Stage {
  agent: AgentName;
  label: string;
  next: Stage | null;
}

/** ワークフローの定義 */
const WORKFLOW_STAGES: Stage[] = [
  { agent: "researcher", label: "リサーチ", next: null },
  { agent: "planner", label: "アウトライン作成", next: null },
  { agent: "writer", label: "執筆", next: null },
  { agent: "editor", label: "編集", next: null },
  { agent: "reviewer", label: "レビュー", next: null },
];

// 次のステージを設定
for (let i = 0; i < WORKFLOW_STAGES.length - 1; i++) {
  const currentStage = WORKFLOW_STAGES[i];
  const nextStage = WORKFLOW_STAGES[i + 1];
  if (currentStage && nextStage) {
    currentStage.next = nextStage;
  }
}

/** 進捗トラッカー */
export class ProgressTracker {
  private currentAgent: AgentName | null = null;
  private startTime: number = 0;
  private stageTimings: Map<AgentName, number> = new Map();
  private reviewCount: number = 0;
  private maxReviews: number = 3;
  private isTTY: boolean;

  constructor() {
    this.isTTY = process.stderr.isTTY ?? false;
  }

  /** 進捗追跡を開始 */
  start(maxReviews: number): void {
    this.startTime = Date.now();
    this.maxReviews = maxReviews;
    this.reviewCount = 0;
    this.stageTimings.clear();
    if (this.isTTY) {
      this.render();
    }
  }

  /** エージェントを更新 */
  updateAgent(agent: AgentName, reviewCount?: number): void {
    // 前のエージェントの時間を記録
    if (this.currentAgent) {
      this.stageTimings.set(this.currentAgent, Date.now());
    }
    this.currentAgent = agent;
    if (reviewCount !== undefined) {
      this.reviewCount = reviewCount;
    }
    if (this.isTTY) {
      this.render();
    }
  }

  /** 進捗を完了 */
  complete(): void {
    if (this.currentAgent) {
      this.stageTimings.set(this.currentAgent, Date.now());
    }
    if (this.isTTY) {
      process.stderr.write("\r\x1b[K");
    }
  }

  /** 進捗を描画 */
  private render(): void {
    const progressBar = this.renderProgressBar();
    const statusLine = this.renderStatusLine();
    const timeEstimate = this.renderTimeEstimate();

    process.stderr.write(`\r\x1b[K${progressBar}\n${statusLine}\n${timeEstimate}`);
  }

  /** 進捗バーを描画 */
  private renderProgressBar(): string {
    const totalStages = WORKFLOW_STAGES.length;
    const currentStageIndex = this.currentAgent
      ? WORKFLOW_STAGES.findIndex((s) => s.agent === this.currentAgent)
      : -1;

    if (currentStageIndex < 0) {
      return "[                                        ] 0%";
    }

    // レビュー回数を考慮した総ステップ数を計算
    const extraSteps = this.reviewCount * 2; // ライターとエディターが追加で実行される
    const totalSteps = totalStages + extraSteps;
    const currentStep = currentStageIndex + 1 + Math.min(this.reviewCount * 2, extraSteps);

    const percentage = Math.min(100, Math.floor((currentStep / totalSteps) * 100));
    const filled = Math.floor((percentage / 100) * 40);

    const bar = "█".repeat(filled) + " ".repeat(40 - filled);
    return `[${bar}] ${percentage.toString().padStart(3)}%`;
  }

  /** ステータス行を描画 */
  private renderStatusLine(): string {
    if (!this.currentAgent) {
      return "準備中...";
    }

    const agentLabel = AGENT_LABELS[this.currentAgent];
    const stage = WORKFLOW_STAGES.find((s) => s.agent === this.currentAgent);
    const stageLabel = stage?.label ?? "";

    let status = `🔄 ${agentLabel}が作業中 (${stageLabel})`;

    // レビュー中の場合は回数を表示
    if (this.currentAgent === "reviewer") {
      status += ` [${this.reviewCount}/${this.maxReviews}回目]`;
    }

    return status;
  }

  /** 推定残り時間を描画 */
  private renderTimeEstimate(): string {
    const elapsed = Date.now() - this.startTime;

    if (elapsed < 1000) {
      return "⏱️  経過時間: <1秒";
    }

    // 平均ステージ時間を計算
    const completedStages = this.stageTimings.size;
    let avgStageTime = 0;

    if (completedStages > 0 && this.currentAgent) {
      // 現在のステージも含めて計算
      const currentStageIndex = WORKFLOW_STAGES.findIndex((s) => s.agent === this.currentAgent);
      const remainingStages = WORKFLOW_STAGES.length - currentStageIndex - 1;

      // これまでの平均時間
      avgStageTime = elapsed / (completedStages + 1);

      // 推定残り時間
      const estimatedRemaining = avgStageTime * remainingStages;
      const estimatedTotal = elapsed + estimatedRemaining;

      return `⏱️  経過: ${this.formatDuration(elapsed)} | 推定残り: ${this.formatDuration(estimatedRemaining)} | 合計推定: ${this.formatDuration(estimatedTotal)}`;
    }

    return `⏱️  経過時間: ${this.formatDuration(elapsed)}`;
  }

  /** 時間をフォーマット */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes}分`;
  }
}

/** グローバル進捗トラッカー */
let globalTracker: ProgressTracker | null = null;

/** グローバル進捗トラッカーを取得 */
export function getProgressTracker(): ProgressTracker {
  if (!globalTracker) {
    globalTracker = new ProgressTracker();
  }
  return globalTracker;
}

/** グローバル進捗トラッカーをリセット */
export function resetProgressTracker(): void {
  globalTracker = null;
}
