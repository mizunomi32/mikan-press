/**
 * cache.ts のテスト
 *
 * キャッシュ機能を検証します。
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Cache, getFetchCache, resetFetchCache } from "../../src/utils/cache.js";

describe("cache.ts", () => {
  describe("Cache", () => {
    let cache: Cache<string>;

    beforeEach(() => {
      cache = new Cache<string>({ ttl: 1000, maxSize: 3 });
    });

    test("値をセットして取得できる", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    test("存在しないキーでundefinedを返す", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    test("古いキャッシュを期限切れで削除する", async () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");

      // TTL経過待機
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cache.get("key1")).toBeUndefined();
    });

    test("最大サイズを超えると古いエントリを削除する", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size).toBe(3);

      // 4つ目を追加すると最も古いkey1が削除される
      cache.set("key4", "value4");
      expect(cache.size).toBe(3);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    test("同じキーをセットすると値が更新される", () => {
      cache.set("key1", "value1");
      cache.set("key1", "value2");
      expect(cache.get("key1")).toBe("value2");
    });

    test("clearですべてのエントリを削除する", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);

      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
    });

    test("getでアクセス順が更新される（LRU）", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // key1にアクセスしてアクセス順を更新
      cache.get("key1");

      // key4を追加すると、最もアクセスされていないkey2が削除される
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    test("getStatsで統計情報を取得できる", () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(3);
      expect(stats.ttl).toBe(1000);

      cache.set("key1", "value1");
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(1);
    });
  });

  describe("getFetchCache", () => {
    afterEach(() => {
      resetFetchCache();
    });

    test("グローバルキャッシュインスタンスを返す", () => {
      const cache1 = getFetchCache();
      const cache2 = getFetchCache();
      expect(cache1).toBe(cache2);
    });

    test("リセット後に新しいインスタンスを返す", () => {
      const cache1 = getFetchCache();
      resetFetchCache();
      const cache2 = getFetchCache();
      expect(cache1).not.toBe(cache2);
    });

    test("オプションを指定してキャッシュを作成できる", () => {
      resetFetchCache();
      const cache = getFetchCache({ ttl: 10000, maxSize: 200 });
      const stats = cache.getStats();
      expect(stats.ttl).toBe(10000);
      expect(stats.maxSize).toBe(200);
    });
  });

  describe("resetFetchCache", () => {
    test("キャッシュをリセットする", () => {
      const cache = getFetchCache();
      cache.set("key1", "value1");
      expect(cache.size).toBe(1);

      resetFetchCache();
      const newCache = getFetchCache();
      expect(newCache.size).toBe(0);
    });
  });
});
