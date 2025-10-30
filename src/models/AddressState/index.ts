import EventEmitter from "events";
import { Logger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { isValidPublicAddress } from "../../utilities/isValidPublicAddress";
import { Adapter } from "../Adapter";
import { Address } from "../Address";
import { BindingCache } from "../BindingCache";
import { Envelope } from "../Envelope";

export namespace AddressState {
	export interface EventMap {
		address: [address: Address | undefined, isReachable: boolean];
	}

	export interface Options {
		adapter: Adapter;
		bindings: BindingCache;
		isAddressValidationDisabled?: boolean;
		logger?: Logger;
		reachableWindowMs: number;
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
 * const addressState = new AddressState({
 *   adapter,
 *   bindings,
 *   reachableWindowMs: 60_000
 * });
 * addressState.external = myExternalAddress;
 *
 * addressState.events.on("publicStatusChanged", (isReachable) => {
 *   console.log("Public status:", isReachable);
 * });
 * ```
 */
export class AddressState {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_REACHABLE_WINDOW_MS = 60_000;

	public adapter: Adapter;
	public external?: Address;
	public events: EventEmitter<AddressState.EventMap>;
	public options: AddressState.Options;
	public lastUnsolicitedAt: number = 0;
	private consensusReflection?: Address;
	private challengingReflection?: Address;
	public state: AddressState.State = AddressState.STATE.CLOSED;

	constructor(options: RequiredProperties<AddressState.Options, "adapter" | "bindings">) {
		this.options = {
			reachableWindowMs: AddressState.DEFAULT_REACHABLE_WINDOW_MS,
			...options,
		};

		this.adapter = options.adapter;
		this.events = new EventEmitter();

		options.adapter.events.on("envelope", this.adapterListeners.envelopeListener);
		this.state = Adapter.STATE.OPENED;
	}

	/**
	 * Closes the address state and removes adapter listener.
	 */
	close(): void {
		if (this.state === Adapter.STATE.CLOSED) return;

		this.adapter.events.removeListener("envelope", this.adapterListeners.envelopeListener);
		this.state = Adapter.STATE.CLOSED;
	}

	private handleEnvelope = (envelope: Envelope, context: Adapter.Context) => {
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
			}
		}
	}

	private handleReflection = (remoteAddress: Address, reflectionAddress: Address) => {
		if (!this.options.isAddressValidationDisabled && !isValidPublicAddress(reflectionAddress)) {
			this.options.logger?.debug("Rejected reflection: invalid public address");
			return;
		}

		// Skip reflections from the same prefix to ensure diversity
		if (this.consensusReflection && remoteAddress.prefix === this.consensusReflection.prefix) return;
		if (this.challengingReflection && remoteAddress.prefix === this.challengingReflection.prefix) return;

		const previousExternal = this.external?.key;
		let newExternal: Address | undefined;

		// Case 1: No consensus yet
		if (!this.consensusReflection) {
			// If no challenging reflection, this becomes the challenging one
			if (!this.challengingReflection) {
				this.challengingReflection = reflectionAddress;
				return;
			}

			// If challenging reflection matches this one, it becomes consensus
			if (this.challengingReflection.key === reflectionAddress.key) {
				this.consensusReflection = reflectionAddress;
				this.challengingReflection = undefined;
				newExternal = this.consensusReflection;
			} else {
				// New reflection doesn't match challenging, overwrite it
				this.challengingReflection = reflectionAddress;
				return;
			}
		}
		// Case 2: We have consensus
		else {
			// If new reflection matches consensus, ignore it
			if (this.consensusReflection.key === reflectionAddress.key) return;

			// New reflection challenges the consensus - overwrite any existing challenger
			this.challengingReflection = reflectionAddress;

			// If we have both consensus and challenger that disagree, it's symmetric NAT
			newExternal = undefined;
		}

		// Only emit if external address changed
		if (newExternal?.key !== previousExternal) {
			this.external = newExternal;
			this.options.bindings.external = newExternal;
			this.events.emit("address", this.external, this.isReachable);
		}
	};

	isRemoteAddress(address: Address | undefined): boolean {
		return !!address && address.type === this.adapter.local.type && address.key !== this.adapter.local.key && address.key !== this.external?.key;
	}

	get isReachable(): boolean {
		return Date.now() - this.lastUnsolicitedAt < this.options.reachableWindowMs;
	}

	get isSymmetric(): boolean {
		return !this.external && !!this.consensusReflection && !!this.challengingReflection;
	}

	adapterListeners = {
		envelopeListener: (envelope: Envelope, context: Adapter.Context) => {
			this.handleEnvelope(envelope, context);
		},
	};
}
