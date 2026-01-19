import EventEmitter from "events";
import type { Address } from "../Address";
import type { AddressType } from "../Address/Type";
import type { EventEmitterOptions } from "../EventEmitter";

export namespace Coordinators {
	export interface EventMap {
		add: [buffer: Uint8Array, address: Address];
		depleted: [];
		remove: [];
		error: [error: unknown];
	}

	export interface Options extends EventEmitterOptions {
		coordinatorCount?: number;
		excluded?: Set<string>;
		expectedType?: AddressType;
	}

	export interface ResolvedOptions extends Options {
		coordinatorCount: number;
	}
}

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
	static readonly DEFAULT_COORDINATOR_COUNT = 9;

	private map = new Map<string, Address>();

	public events: EventEmitter<Coordinators.EventMap>;
	public options: Coordinators.ResolvedOptions;

	constructor(options?: Coordinators.Options) {
		this.options = {
			coordinatorCount: Coordinators.DEFAULT_COORDINATOR_COUNT,
			...options,
		};

		this.events = new EventEmitter(this.options);
	}

	/**
	 * Adds a coordinator to the pool.
	 *
	 * @param address - Coordinator address to add
	 */
	add(address: Address): void {
		this.map.set(address.key, address);
	}

	/**
	 * Atomically tries to add a coordinator if pool is not full.
	 * Prevents race conditions during concurrent coordinator discovery.
	 *
	 * @param address - Coordinator address to add
	 * @returns true if added, false if already exists or pool is full
	 */
	tryAdd(address: Address): boolean {
		if (this.map.has(address.key)) return false;
		if (this.map.size >= this.options.coordinatorCount) return false;

		this.map.set(address.key, address);

		return true;
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

	isValidAddress(address: Address, expectedType?: AddressType): boolean {
		const typeToCheck = expectedType ?? this.options.expectedType;
		const isExcluded = this.options.excluded?.has(address.key);
		const isAlreadyCoordinator = this.has(address.key);
		const hasSpace = this.size < this.options.coordinatorCount;
		const isCorrectType = !typeToCheck || address.type === typeToCheck;

		return !isExcluded && !isAlreadyCoordinator && hasSpace && isCorrectType;
	}

	/**
	 * Gets all coordinators as an array.
	 *
	 * @returns Array of coordinator addresses
	 */
	list(): Array<Address> {
		return [...this.map.values()];
	}

	/**
	 * Removes a coordinator from the pool.
	 *
	 * @param key - Address key of coordinator to remove
	 */
	remove(key: string): void {
		const hadCoordinator = this.map.has(key);
		this.map.delete(key);

		if (hadCoordinator && this.map.size === 0) {
			this.events.emit("depleted");
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
