import { setTimeout } from "timers/promises";
import { Cache } from ".";

it("sets and gets a valid value", () => {
	const cache = new Cache(500, 1000);

	const key = "test";

	cache.set(key);

	const value = cache.get(key);

	expect(value).toBeDefined();

	const isExists = cache.has(key);

	expect(isExists).toBe(true);
});

it("sets and gets an expired value", async () => {
	const cache = new Cache(50, 1000);

	const key = "test";

	cache.set(key);

	await setTimeout(100);

	const value = cache.get(key);

	expect(value).toBe(undefined);

	const isExists = cache.has(key);

	expect(isExists).toBe(false);
});

it("prunes expired values", async () => {
	const cache = new Cache(50, 1000);

	cache.set("test");

	await setTimeout(100);

	cache.set("test2");

	expect(cache.size).toBe(1);
});
