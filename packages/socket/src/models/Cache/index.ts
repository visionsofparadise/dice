export namespace Cache {
	export interface Item<T> {
		value: T;
		createdAt: number;
	}
}

export class Cache<T> {
	map = new Map<string | number, Cache.Item<T>>();

	constructor(
		public readonly ttl: number,
		public readonly limit: number
	) {}

	*[Symbol.iterator](): IterableIterator<[string | number, T]> {
		const now = Date.now();

		for (const [key, item] of this.map) {
			if (now > item.createdAt + this.ttl) {
				this.map.delete(key);
			} else {
				yield [key, item.value];
			}
		}
	}

	delete(key: string | number): void {
		this.map.delete(key);

		return;
	}

	get(key: string | number, now = Date.now()): T | undefined {
		const item = this.map.get(key);

		if (!item) return undefined;

		if (now > item.createdAt + this.ttl) {
			this.map.delete(key);

			return undefined;
		}

		return item.value;
	}

	has(key: string | number): boolean {
		return !!this.get(key);
	}

	get isFull(): boolean {
		return this.size >= this.limit;
	}

	*keys(): IterableIterator<string | number> {
		for (const [key] of this) yield key;
	}

	set(key: string | number, value: T, now = Date.now()): this {
		this.map.set(key, {
			value,
			createdAt: now,
		});

		const values = this.map.entries();

		let result = values.next();

		while (!result.done && (now > result.value[1].createdAt + this.ttl || this.map.size > this.limit)) {
			this.map.delete(result.value[0]);

			result = values.next();
		}

		return this;
	}

	get size(): number {
		const now = Date.now();

		for (const [key, item] of this.map) if (now > item.createdAt + this.ttl) this.map.delete(key);

		return this.map.size;
	}

	*values(): IterableIterator<T> {
		for (const [_, value] of this) yield value;
	}
}
