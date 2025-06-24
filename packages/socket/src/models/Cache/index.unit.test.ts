import { setTimeout } from "timers/promises";
import { Cache } from ".";

it("sets and gets a valid value", () => {
	const cache = new Cache<undefined>(500, 1000);

	const key = "test";

	cache.set(key, undefined);

	const value = cache.get(key);

	expect(value).toBeDefined();

	const isExists = cache.has(key);

	expect(isExists).toBe(true);
});

it("sets and gets an expired value", async () => {
	const cache = new Cache<undefined>(50, 1000);

	const key = "test";

	cache.set(key, undefined);

	await setTimeout(100);

	const value = cache.get(key);

	expect(value).toBe(undefined);

	const isExists = cache.has(key);

	expect(isExists).toBe(false);
});

it("prunes expired values", async () => {
	const cache = new Cache<undefined>(50, 1000);

	cache.set("test", undefined);

	await setTimeout(100);

	cache.set("test2", undefined);

	expect(cache.map.size).toBe(1);
});
