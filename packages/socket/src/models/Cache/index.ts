export namespace Cache {
	export interface Item<T> {
		value: T;
		expiresAt: number;
	}
}

export class Cache<T> {
	map = new Map<string, Cache.Item<T>>();

	constructor(
		public readonly ttl: number,
		public readonly limit: number
	) {}

	has(key: string): boolean {
		return !!this.get(key);
	}

	get(key: string): Cache.Item<T> | undefined {
		const item = this.map.get(key);

		if (!item) return undefined;

		const now = Date.now();

		if (now - item.expiresAt > this.ttl) {
			this.map.delete(key);

			return undefined;
		}

		return item;
	}

	set(key: string, value: T): this {
		const now = Date.now();

		this.map.set(key, {
			value,
			expiresAt: now,
		});

		const values = this.map.entries();

		let result = values.next();

		while (!result.done && (now - result.value[1].expiresAt > this.ttl || this.map.size > this.limit)) {
			this.map.delete(result.value[0]);

			result = values.next();
		}

		return this;
	}
}
