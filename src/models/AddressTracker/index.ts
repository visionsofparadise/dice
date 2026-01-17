import EventEmitter from "events";
import type { Logger } from "../../utilities/Logger";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import { isValidPublicAddress } from "../../utilities/isValidPublicAddress";
import type { Address } from "../Address";
import type { BindingCache } from "../BindingCache";
import type { Envelope } from "../Envelope";
import type { UdpTransport } from "../UdpTransport";

export namespace AddressTracker {
	export interface EventMap {
		address: [address: Address | undefined, isReachable: boolean];
		reachable: [isReachable: boolean];
	}

	export interface Options {
		bindings: BindingCache;
		isAddressValidationDisabled?: boolean;
		logger?: Logger;
		reachableWindowMs: number;
		udpTransport: UdpTransport;
	}

	export type State = 0 | 1;
}

/**
 * Manages external address and public reachability detection.
 *
 * Tracks unsolicited messages (messages from peers without outbound bindings)
 * to determine if this peer is publicly reachable.
 *
 * @example
 * ```typescript
 * const addressTracker = new AddressTracker({
 *   bindings,
 *   reachableWindowMs: 60_000,
 *   udpTransport,
 * });
 * addressTracker.external = myExternalAddress;
 *
 * addressTracker.events.on("publicStatusChanged", (isReachable) => {
 *   console.log("Public status:", isReachable);
 * });
 * ```
 */
export class AddressTracker {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_REACHABLE_WINDOW_MS = 60_000;

	public external?: Address;
	public events: EventEmitter<AddressTracker.EventMap>;
	public options: AddressTracker.Options;
	public lastUnsolicitedAt = 0;
	private reflections: Array<{ prefix: string; address: Address }> = [];
	public state: AddressTracker.State = AddressTracker.STATE.CLOSED;
	public udpTransport: UdpTransport;

	constructor(options: RequiredProperties<AddressTracker.Options, "bindings" | "udpTransport">) {
		this.options = {
			reachableWindowMs: AddressTracker.DEFAULT_REACHABLE_WINDOW_MS,
			...options,
		};

		this.udpTransport = options.udpTransport;
		this.events = new EventEmitter();

		options.udpTransport.events.on("envelope", this.udpTransportListeners.envelopeListener);
		this.state = AddressTracker.STATE.OPENED;
	}

	/**
	 * Closes the address state and removes udpTransport listener.
	 */
	close(): void {
		if (this.state === AddressTracker.STATE.CLOSED) {
			return;
		}

		this.udpTransport.events.removeListener("envelope", this.udpTransportListeners.envelopeListener);
		this.state = AddressTracker.STATE.CLOSED;
	}

	private handleEnvelope = (envelope: Envelope, context: UdpTransport.Context) => {
		const remoteAddress = context.remoteAddress;

		if (envelope.reflectionAddress) {
			this.processReflection(remoteAddress, envelope.reflectionAddress);
		}

		this.trackReachability(remoteAddress);
	};

	private processReflection(remoteAddress: Address, reflectionAddress: Address): void {
		this.handleReflection(remoteAddress, reflectionAddress);
	}

	private trackReachability(remoteAddress: Address): void {
		if (this.external && !this.options.bindings.hasOutboundBinding(this.external.key, remoteAddress.key)) {
			const wasReachable = this.isReachable;

			this.lastUnsolicitedAt = Date.now();

			const isReachableNow = this.isReachable;

			if (wasReachable !== isReachableNow) {
				this.events.emit("address", this.external, isReachableNow);
				this.events.emit("reachable", isReachableNow);
			}
		}
	}

	private handleReflection = (remoteAddress: Address, reflectionAddress: Address) => {
		if (!this.options.isAddressValidationDisabled && !isValidPublicAddress(reflectionAddress)) {
			this.options.logger?.debug("Rejected reflection: invalid public address");

			return;
		}

		const prefix = remoteAddress.prefix;
		const previousExternal = this.external?.key;

		const hasSamePrefix = this.reflections.some((reflection) => reflection.prefix === prefix);

		if (hasSamePrefix) return;

		this.reflections.push({ prefix, address: reflectionAddress });
		if (this.reflections.length > 2) {
			this.reflections.shift();
		}

		let newExternal: Address | undefined;

		if (this.reflections[0] && this.reflections[1]) {
			if (this.reflections[0].address.key === this.reflections[1].address.key) {
				newExternal = this.reflections[0].address;
			}
		}

		if (newExternal?.key !== previousExternal) {
			this.external = newExternal;
			this.options.bindings.external = newExternal;

			this.events.emit("address", this.external, this.isReachable);
		}
	};

	isRemoteAddress(address: Address | undefined): boolean {
		return !!address && address.type === this.udpTransport.local.type && address.key !== this.udpTransport.local.key && address.key !== this.external?.key;
	}

	get isReachable(): boolean {
		return Date.now() - this.lastUnsolicitedAt < this.options.reachableWindowMs;
	}

	get isSymmetric(): boolean {
		return !this.external && this.reflections.length === 2;
	}

	udpTransportListeners = {
		envelopeListener: (envelope: Envelope, context: UdpTransport.Context) => {
			this.handleEnvelope(envelope, context);
		},
	};
}
