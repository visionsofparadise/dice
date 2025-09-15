export class Cache {
	map = new Map<string | number, number>();

	constructor(
		public readonly ttl: number,
		public readonly limit: number
	) {}

	*[Symbol.iterator](): IterableIterator<string | number> {
		const now = Date.now();

		for (const [key, value] of this.map) {
			if (now > value + this.ttl) {
				this.map.delete(key);

				continue;
			}

			yield key;
		}
	}

	add(key: string | number, now = Date.now()): this {
		this.map.delete(key);
		this.map.set(key, now);

		for (const [key, value] of this.map) {
			if (now > value + this.ttl) {
				this.map.delete(key);

				continue;
			}

			break;
		}

		if (this.map.size > this.limit) {
			for (const key of this.map.keys()) {
				this.map.delete(key);

				if (this.map.size <= this.limit) break;
			}
		}

		return this;
	}

	delete(key: string | number): void {
		this.map.delete(key);

		return;
	}

	has(key: string | number, now = Date.now()): boolean {
		const value = this.map.get(key);

		if (!value) return false;

		if (now > value + this.ttl) {
			this.map.delete(key);

			return false;
		}

		return true;
	}
}
