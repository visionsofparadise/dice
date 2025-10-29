export class Cache {
	map = new Map<string, number>();

	constructor(
		public readonly ttl: number,
		public readonly limit: number
	) {}

	private combineKeys(keyA: string, keyB: string): string {
		return `${keyA}-${keyB}`;
	}

	*[Symbol.iterator](): IterableIterator<string> {
		const now = Date.now();

		for (const [key, value] of this.map) {
			if (now > value + this.ttl) {
				this.map.delete(key);

				continue;
			}

			yield key;
		}
	}

	add(keyA: string, keyB: string, now = Date.now()): this {
		const key = this.combineKeys(keyA, keyB);
		this.map.delete(key);
		this.map.set(key, now);

		// Clean expired entries from the front of the cache
		// Map maintains insertion order, so we can stop at the first non-expired entry
		for (const [key, value] of this.map) {
			if (now > value + this.ttl) {
				this.map.delete(key);

				continue;
			}

			break;  // Stop at first non-expired entry - all subsequent entries are newer
		}

		if (this.map.size > this.limit) {
			for (const key of this.map.keys()) {
				this.map.delete(key);

				if (this.map.size <= this.limit) break;
			}
		}

		return this;
	}

	delete(keyA: string, keyB: string): void {
		const key = this.combineKeys(keyA, keyB);
		this.map.delete(key);

		return;
	}

	has(keyA: string, keyB: string, now = Date.now()): boolean {
		const key = this.combineKeys(keyA, keyB);
		const value = this.map.get(key);

		if (!value) return false;

		if (now > value + this.ttl) {
			this.map.delete(key);

			return false;
		}

		return true;
	}
}
