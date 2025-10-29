import { sampleSize } from "lodash-es";
import { Address } from "../Address";

/**
 * Manages the pool of candidate peers for general connectivity.
 *
 * Candidates are peers that have sent us messages and are potential
 * future coordinators. Pool uses FIFO eviction when full.
 *
 * @example
 * ```typescript
 * const candidates = new Candidates();
 * candidates.addWithFifo(address, 100);  // Max 100 candidates
 * const sample = candidates.getSample(10);  // Random sample for healthcheck
 * ```
 */
export class Candidates {
	private map = new Map<string, Address>();

	/**
	 * Adds a candidate to the pool without eviction.
	 *
	 * Use this for test setup. For production, use addWithFifo().
	 *
	 * @param address - Candidate address to add
	 */
	add(address: Address): void {
		this.map.set(address.key, address);
	}

	/**
	 * Adds a candidate with FIFO eviction if pool is full.
	 *
	 * If the pool is at maxSize, removes the oldest entry before adding.
	 * Map maintains insertion order, so first key is oldest.
	 *
	 * @param address - Candidate address to add
	 * @param maxSize - Maximum pool size
	 */
	addWithFifo(address: Address, maxSize: number): void {
		// FIFO eviction: remove oldest entry if at capacity
		if (this.map.size >= maxSize) {
			const oldestKey = this.map.keys().next().value;
			if (oldestKey) this.map.delete(oldestKey);
		}

		// Add the new candidate address
		this.map.set(address.key, address);
	}

	/**
	 * Removes a candidate from the pool.
	 *
	 * @param key - Address key of candidate to remove
	 */
	remove(key: string): void {
		this.map.delete(key);
	}

	/**
	 * Checks if an address is in the candidate pool.
	 *
	 * @param key - Address key to check
	 * @returns true if address is a candidate
	 */
	has(key: string): boolean {
		return this.map.has(key);
	}

	/**
	 * Gets all candidates as an array.
	 *
	 * @returns Array of candidate addresses
	 */
	getAll(): Address[] {
		return [...this.map.values()];
	}

	/**
	 * Gets a random sample of candidates.
	 *
	 * Used for healthcheck to ping a subset rather than all candidates.
	 *
	 * @param size - Number of candidates to sample
	 * @returns Random sample of candidate addresses
	 */
	getSample(size: number): Address[] {
		return sampleSize(this.getAll(), size);
	}

	/**
	 * Gets the internal candidate map.
	 *
	 * Used for bulk operations like healthcheck.
	 *
	 * @returns Map of candidate addresses
	 */
	getMap(): Map<string, Address> {
		return this.map;
	}

	/**
	 * Replaces the entire candidate pool.
	 *
	 * Used during healthcheck to remove dead candidates.
	 *
	 * @param newMap - New candidate map
	 */
	replaceAll(newMap: Map<string, Address>): void {
		this.map = new Map(newMap);
	}

	/**
	 * Gets the current size of the candidate pool.
	 *
	 * @returns Number of candidates
	 */
	get size(): number {
		return this.map.size;
	}
}
