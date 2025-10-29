import { Cache } from "../Cache";

/**
 * Manages NAT binding caches for inbound and outbound connections.
 *
 * Tracks established NAT holes with different TTLs:
 * - Inbound: 25s (peer → us)
 * - Outbound: 20s (us → peer)
 *
 * @example
 * ```typescript
 * const bindings = new BindingCache(25_000, 20_000, 10_000);
 * bindings.establishOutboundBinding(myAddress, peerAddress);
 * if (bindings.hasActiveConnection(myAddress, peerAddress)) {
 *   // Skip NAT traversal, connection exists
 * }
 * ```
 */
export class BindingCache {
	private bindIn: Cache;
	private bindOut: Cache;

	constructor(bindInTtlMs: number, bindOutTtlMs: number, cacheSize: number) {
		this.bindIn = new Cache(bindInTtlMs, cacheSize);
		this.bindOut = new Cache(bindOutTtlMs, cacheSize);
	}

	/**
	 * Checks if an inbound binding exists (peer → us).
	 *
	 * @param peerKey - Key of the peer address
	 * @param selfKey - Key of our external address
	 * @returns true if binding exists and hasn't expired
	 */
	hasInboundBinding(peerKey: string, selfKey: string): boolean {
		return this.bindIn.has(peerKey, selfKey);
	}

	/**
	 * Establishes an inbound binding (peer → us).
	 *
	 * @param peerKey - Key of the peer address
	 * @param selfKey - Key of our external address
	 */
	establishInboundBinding(peerKey: string, selfKey: string): void {
		this.bindIn.add(peerKey, selfKey);
	}

	/**
	 * Checks if an outbound binding exists (us → peer).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 * @returns true if binding exists and hasn't expired
	 */
	hasOutboundBinding(selfKey: string, peerKey: string): boolean {
		return this.bindOut.has(selfKey, peerKey);
	}

	/**
	 * Establishes an outbound binding (us → peer).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 */
	establishOutboundBinding(selfKey: string, peerKey: string): void {
		this.bindOut.add(selfKey, peerKey);
	}

	/**
	 * Checks if any active connection exists (inbound or outbound).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 * @returns true if either direction has an active binding
	 */
	hasActiveConnection(selfKey: string, peerKey: string): boolean {
		return this.hasInboundBinding(peerKey, selfKey) || this.hasOutboundBinding(selfKey, peerKey);
	}
}
