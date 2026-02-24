/**
 * シンプルなインメモリキャッシュ
 *
 * Web Fetchツールなどで同じURLへのリクエストを重複回避するために使用します。
 */

/** キャッシュエントリ */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** キャッシュ設定オプション */
export interface CacheOptions {
  /** キャッシュの有効期限（ミリ秒）、デフォルト: 5分 */
  ttl?: number;
  /** 最大キャッシュエントリ数、デフォルト: 100 */
  maxSize?: number;
}

/**
 * シンプルなLRUキャッシュ
 *
 * TTLベースの期限切りと、サイズ制限によるLRU削除をサポートします。
 */
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number;
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000; // デフォルト5分
    this.maxSize = options.maxSize ?? 100;
  }

  /**
   * キャッシュから値を取得
   *
   * @param key - キャッシュキー
   * @returns キャッシュされた値、存在しないか期限切れの場合はundefined
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    // エントリが存在しない
    if (!entry) {
      return undefined;
    }

    // 期限切れチェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return undefined;
    }

    // アクセス順を更新（LRU）
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   *
   * @param key - キャッシュキー
   * @param value - キャッシュする値
   */
  set(key: string, value: T): void {
    // サイズ制限チェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 最も古いエントリを削除
      const oldestKey = this.accessOrder[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.shift();
      }
    }

    // 期限切れの古いエントリをクリーンアップ
    this.cleanup();

    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });

    // アクセス順を更新
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 期限切れのエントリを削除
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
      }
    }
  }

  /**
   * 現在のキャッシュサイズを取得
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

/**
 * Web Fetch用のグローバルキャッシュインスタンス
 */
let globalFetchCache: Cache<string> | null = null;

/**
 * Web Fetch用キャッシュを取得
 *
 * @param options - キャッシュ設定オプション（初回のみ有効）
 * @returns キャッシュインスタンス
 */
export function getFetchCache(options?: CacheOptions): Cache<string> {
  if (!globalFetchCache) {
    globalFetchCache = new Cache<string>(options);
  }
  return globalFetchCache;
}

/**
 * Web Fetch用キャッシュをリセット
 */
export function resetFetchCache(): void {
  if (globalFetchCache) {
    globalFetchCache.clear();
  }
  globalFetchCache = null;
}
