import { Address } from "../Address";

/**
 * Manages the pool of coordinator peers used for NAT traversal.
 *
 * Coordinators are vetted, health-checked peers that relay NAT traversal
 * signals. They must be public (not private IP, not symmetric NAT) and
 * responsive to health checks.
 *
 * @example
 * ```typescript
 * const coordinators = new Coordinators();
 * coordinators.add(publicAddress);
 * if (coordinators.has(address.key)) {
 *   // Already a coordinator
 * }
 * ```
 */
export class Coordinators {
	private map = new Map<string, Address>();

	/**
	 * Adds a coordinator to the pool.
	 *
	 * @param address - Coordinator address to add
	 */
	add(address: Address): void {
		this.map.set(address.key, address);
	}

	/**
	 * Removes a coordinator from the pool.
	 *
	 * @param key - Address key of coordinator to remove
	 */
	remove(key: string): void {
		this.map.delete(key);
	}

	/**
	 * Checks if an address is in the coordinator pool.
	 *
	 * @param key - Address key to check
	 * @returns true if address is a coordinator
	 */
	has(key: string): boolean {
		return this.map.has(key);
	}

	/**
	 * Gets all coordinators as an array.
	 *
	 * @returns Array of coordinator addresses
	 */
	getAll(): Address[] {
		return [...this.map.values()];
	}

	/**
	 * Gets the internal coordinator map.
	 *
	 * Used for bulk operations like healthcheck.
	 *
	 * @returns Map of coordinator addresses
	 */
	getMap(): Map<string, Address> {
		return this.map;
	}

	/**
	 * Replaces the entire coordinator pool.
	 *
	 * Truncates to maxSize if provided. Used during healthcheck
	 * to replace dead coordinators with new ones.
	 *
	 * @param newMap - New coordinator map
	 * @param maxSize - Maximum number of coordinators to keep
	 */
	replaceAll(newMap: Map<string, Address>, maxSize?: number): void {
		if (maxSize !== undefined) {
			this.map = new Map([...newMap].slice(0, maxSize));
		} else {
			this.map = new Map(newMap);
		}
	}

	/**
	 * Gets the current size of the coordinator pool.
	 *
	 * @returns Number of coordinators
	 */
	get size(): number {
		return this.map.size;
	}
}
