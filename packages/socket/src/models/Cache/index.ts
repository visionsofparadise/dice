export class Cache extends Map<string, number> {
	constructor(
		public readonly ttl: number,
		public readonly limit: number
	) {
		super();
	}

	has(key: string): boolean {
		return !!this.get(key);
	}

	get(key: string): number | undefined {
		const value = super.get(key);

		if (!value) return undefined;

		const now = Date.now();

		if (now - value > this.ttl) {
			super.delete(key);

			return undefined;
		}

		return value;
	}

	set(key: string): this {
		const now = Date.now();

		super.set(key, now);

		const values = this.entries();

		let result = values.next();

		while (!result.done && (now - result.value[1] > this.ttl || this.size > this.limit)) {
			super.delete(result.value[0]);

			result = values.next();
		}

		return this;
	}
}
