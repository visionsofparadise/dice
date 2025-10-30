import { setTimeout } from "timers/promises";
import { Cache } from ".";

describe("Cache", () => {
	describe("basic operations", () => {
		it("sets and gets a valid value", () => {
			const cache = new Cache(500, 1000);
			const keyA = "test";
			const keyB = "value";

			cache.add(keyA, keyB);

			expect(cache.has(keyA, keyB)).toBe(true);
		});

		it("returns false for non-existent keys", () => {
			const cache = new Cache(500, 1000);

			expect(cache.has("nonexistent", "key")).toBe(false);
		});

		it("deletes keys correctly", () => {
			const cache = new Cache(500, 1000);
			const keyA = "test";
			const keyB = "value";

			cache.add(keyA, keyB);
			expect(cache.has(keyA, keyB)).toBe(true);

			cache.delete(keyA, keyB);
			expect(cache.has(keyA, keyB)).toBe(false);
		});
	});

	describe("TTL expiration", () => {
		it("expires values after TTL", async () => {
			const cache = new Cache(50, 1000);
			const keyA = "test";
			const keyB = "value";

			cache.add(keyA, keyB);
			expect(cache.has(keyA, keyB)).toBe(true);

			await setTimeout(100);

			expect(cache.has(keyA, keyB)).toBe(false);
		});

		it("does not expire values before TTL", async () => {
			const cache = new Cache(100, 1000);
			const keyA = "test";
			const keyB = "value";

			cache.add(keyA, keyB);

			await setTimeout(50);

			expect(cache.has(keyA, keyB)).toBe(true);
		});

		it("allows custom timestamp for add", () => {
			const cache = new Cache(100, 1000);
			const pastTime = Date.now() - 200;

			cache.add("test", "value", pastTime);

			expect(cache.has("test", "value")).toBe(false);
		});
	});

	describe("size limits", () => {
		it("enforces size limit with LRU eviction", () => {
			const cache = new Cache(1000, 2); // TTL=1000ms, limit=2

			cache.add("key1", "value1");
			cache.add("key2", "value2");
			cache.add("key3", "value3"); // Should evict key1

			expect(cache.has("key1", "value1")).toBe(false);
			expect(cache.has("key2", "value2")).toBe(true);
			expect(cache.has("key3", "value3")).toBe(true);
		});

		it("maintains insertion order for LRU", () => {
			const cache = new Cache(1000, 3);

			cache.add("a", "1");
			cache.add("b", "2");
			cache.add("c", "3");
			cache.add("d", "4"); // Should evict "a"

			expect(cache.has("a", "1")).toBe(false);
			expect(cache.has("b", "2")).toBe(true);
			expect(cache.has("c", "3")).toBe(true);
			expect(cache.has("d", "4")).toBe(true);
		});
	});

	describe("iteration", () => {
		it("iterates over valid (non-expired) keys", () => {
			const cache = new Cache(1000, 10);

			cache.add("key1", "value1");
			cache.add("key2", "value2");

			const keys = [...cache];

			expect(keys).toContain("key1-value1");
			expect(keys).toContain("key2-value2");
			expect(keys.length).toBe(2);
		});

		it("filters out expired keys during iteration", async () => {
			const cache = new Cache(50, 10);

			cache.add("key1", "value1");
			await setTimeout(100);
			cache.add("key2", "value2");

			const keys = [...cache];

			expect(keys).not.toContain("key1-value1");
			expect(keys).toContain("key2-value2");
			expect(keys.length).toBe(1);
		});
	});

	describe("key combination", () => {
		it("combines keys with dash separator", () => {
			const cache = new Cache(1000, 10);

			cache.add("key:with:colons", "value-with-dashes");

			expect(cache.has("key:with:colons", "value-with-dashes")).toBe(true);
		});

		it("treats different key combinations as different entries", () => {
			const cache = new Cache(1000, 10);

			cache.add("ab", "cd");
			cache.add("a", "bcd");

			expect(cache.has("ab", "cd")).toBe(true);
			expect(cache.has("a", "bcd")).toBe(true);
			expect(cache.has("abc", "d")).toBe(false);
		});
	});
});
