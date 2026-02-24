/**
 * プロンプトバージョン管理の型定義
 */

/**
 * プロンプトファイルのメタデータ
 */
export interface PromptMetadata {
  /** バージョン番号 */
  version: number;
  /** 作成日（ISO 8601形式） */
  created_at: string;
  /** 説明 */
  description: string;
  /** 作者 */
  author: string;
  /** タグ（オプション） */
  tags?: string[];
}

/**
 * プロンプトファイルの内容
 */
export interface PromptContent {
  /** システムプロンプト */
  system: string;
  /** ヒューマンプロンプトテンプレート */
  human: string;
  /** 改稿用プロンプト（オプション） */
  revision?: string;
}

/**
 * プロンプトファイル全体
 */
export interface PromptFile extends PromptMetadata, PromptContent {}
