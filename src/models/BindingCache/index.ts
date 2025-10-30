import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Adapter } from "../Adapter";
import { Address } from "../Address";
import { Cache } from "../Cache";
import { Envelope } from "../Envelope";

export namespace BindingCache {
	export interface Options {
		adapter: Adapter;
		bindInTtlMs?: number;
		bindOutTtlMs?: number;
		cacheSize?: number;
	}
}

/**
 * Manages NAT binding caches for inbound and outbound connections.
 *
 * Tracks established NAT holes with different TTLs:
 * - Inbound: 25s (peer → us)
 * - Outbound: 20s (us → peer)
 *
 * Automatically establishes inbound bindings by listening to adapter envelope events.
 *
 * @example
 * ```typescript
 * const bindings = new BindingCache({
 *   adapter,
 *   bindInTtlMs: 25_000,
 *   bindOutTtlMs: 20_000,
 *   cacheSize: 10_000
 * });
 * bindings.external = myExternalAddress;
 * // BindingCache now automatically tracks bindings from envelope events
 * ```
 */
export class BindingCache {
	static readonly DEFAULT_BIND_IN_TTL_MS = 25_000;
	static readonly DEFAULT_BIND_OUT_TTL_MS = 20_000;
	static readonly DEFAULT_CACHE_SIZE = 10_000;

	private bindIn: Cache;
	private bindOut: Cache;
	private relayBinds: Cache;
	private _external?: Address;

	constructor(options: RequiredProperties<BindingCache.Options, "adapter">) {
		const defaultOptions = {
			bindInTtlMs: BindingCache.DEFAULT_BIND_IN_TTL_MS,
			bindOutTtlMs: BindingCache.DEFAULT_BIND_OUT_TTL_MS,
			cacheSize: BindingCache.DEFAULT_CACHE_SIZE,
			...options,
		};

		this.bindIn = new Cache(defaultOptions.bindInTtlMs, defaultOptions.cacheSize);
		this.bindOut = new Cache(defaultOptions.bindOutTtlMs, defaultOptions.cacheSize);
		// Relay binds use same TTL as bindOut since they track relayed connections
		this.relayBinds = new Cache(defaultOptions.bindOutTtlMs, defaultOptions.cacheSize);

		// Listen to adapter events to automatically establish bindings
		options.adapter.events.on("envelope", this.handleEnvelope);
		options.adapter.events.on("send", this.handleSend);
	}

	get external(): Address | undefined {
		return this._external;
	}

	set external(address: Address | undefined) {
		this._external = address;
	}

	private handleEnvelope = (_envelope: Envelope, context: Adapter.Context) => {
		const remoteAddress = context.remoteAddress;

		// Establish inbound binding
		if (this._external) {
			this.establishInboundBinding(remoteAddress.key, this._external.key);
		}
	};

	private handleSend = (_buffer: Uint8Array, address: Address) => {
		// Establish outbound binding
		if (this._external) {
			this.establishOutboundBinding(this._external.key, address.key);
		}
	};

	/**
	 * Checks if an inbound binding exists (peer → us).
	 *
	 * @param peerKey - Key of the peer address
	 * @param selfKey - Key of our external address
	 * @param now - Optional timestamp for testing
	 * @returns true if binding exists and hasn't expired
	 */
	hasInboundBinding(peerKey: string, selfKey: string, now?: number): boolean {
		return this.bindIn.has(peerKey, selfKey, now);
	}

	/**
	 * Establishes an inbound binding (peer → us).
	 *
	 * @param peerKey - Key of the peer address
	 * @param selfKey - Key of our external address
	 * @param now - Optional timestamp for testing
	 */
	establishInboundBinding(peerKey: string, selfKey: string, now?: number): void {
		this.bindIn.add(peerKey, selfKey, now);
	}

	/**
	 * Checks if an outbound binding exists (us → peer).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 * @param now - Optional timestamp for testing
	 * @returns true if binding exists and hasn't expired
	 */
	hasOutboundBinding(selfKey: string, peerKey: string, now?: number): boolean {
		return this.bindOut.has(selfKey, peerKey, now);
	}

	/**
	 * Establishes an outbound binding (us → peer).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 * @param now - Optional timestamp for testing
	 */
	establishOutboundBinding(selfKey: string, peerKey: string, now?: number): void {
		this.bindOut.add(selfKey, peerKey, now);
	}

	/**
	 * Checks if any active connection exists (both inbound and outbound).
	 *
	 * @param selfKey - Key of our external address
	 * @param peerKey - Key of the peer address
	 * @returns true if both directions have active bindings
	 */
	hasActiveConnection(selfKey: string, peerKey: string): boolean {
		return this.hasInboundBinding(peerKey, selfKey) && this.hasOutboundBinding(selfKey, peerKey);
	}

	/**
	 * Records a relay bind between source and target that we facilitated.
	 *
	 * @param sourceKey - Key of the source address
	 * @param targetKey - Key of the target address
	 * @param now - Optional timestamp for testing
	 */
	recordRelayBind(sourceKey: string, targetKey: string, now?: number): void {
		this.relayBinds.add(sourceKey, targetKey, now);
	}

	/**
	 * Checks if we've recently relayed a bind request for this source-target pair.
	 * Used to prevent relay amplification attacks by refusing repeat binds.
	 *
	 * @param sourceKey - Key of the source address
	 * @param targetKey - Key of the target address
	 * @param now - Optional timestamp for testing
	 * @returns true if we've recently relayed a bind for this pair
	 */
	hasRecentRelayBind(sourceKey: string, targetKey: string, now?: number): boolean {
		return this.relayBinds.has(sourceKey, targetKey, now);
	}
}
