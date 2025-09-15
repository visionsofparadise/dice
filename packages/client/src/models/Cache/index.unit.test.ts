import { setTimeout } from "timers/promises";
import { Cache } from ".";

it("sets and gets a valid value", () => {
	const cache = new Cache(500, 1000);

	const key = "test";

	cache.add(key);

	const isExists = cache.has(key);

	expect(isExists).toBe(true);
});

it("sets and gets an expired value", async () => {
	const cache = new Cache(50, 1000);

	const key = "test";

	cache.add(key);

	await setTimeout(100);

	const isExists = cache.has(key);

	expect(isExists).toBe(false);
});
