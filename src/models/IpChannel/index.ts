import EventEmitter from "events";
import { type Logger, wrapLogger } from "../../utilities/Logger";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import type { Address } from "../Address";
import type { AddressType } from "../Address/Type";
import { AddressTracker } from "../AddressTracker";
import { BindingCache } from "../BindingCache";
import { Coordinators } from "../Coordinators";
import type { DiceAddress } from "../DiceAddress";
import { DiceError } from "../Error";
import type { EventEmitterOptions } from "../EventEmitter";
import type { Message } from "../Message";
import { PendingRequests } from "../PendingRequests";
import { Protocol } from "../Protocol";
import { UdpTransport } from "../UdpTransport";

export namespace IpChannel {
	export interface EventMap {
		address: [address?: Address, coordinators?: Array<Address>];
		close: [];
		error: [error: unknown];
		open: [];
		reachable: [isReachable: boolean];
	}

	export interface Options extends RequiredProperties<UdpTransport.Options, "socket">, Partial<BindingCache.Options>, Partial<PendingRequests.Options>, EventEmitterOptions {
		bootstrapAddresses?: Array<Address>;
		concurrency?: number;
		healthcheckIntervalMs?: number;
		isAddressValidationDisabled?: boolean;
		isPrefixFilteringDisabled?: boolean;
		logger?: Logger;
	}

	export type Context = UdpTransport.Context;
	export type PayloadContext = UdpTransport.PayloadContext;
	export type State = 0 | 1;
}

/**
 * Single-stack ipChannel network for DICE protocol implementation.
 *
 * Manages peer discovery, NAT traversal, and direct UDP messaging for either
 * IPv4 or IPv6. Maintains coordinator pools, handles external address detection
 * through reflection, and coordinates hole punching for NAT traversal.
 *
 * @example
 * ```typescript
 * const ipChannel = new IpChannel({
 *   socket
 * });
 *
 * await ipChannel.open();
 * console.log("External address:", ipChannel.external?.toString());
 * ```
 */
export class IpChannel {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_HEALTHCHECK_INTERVAL_MS = 60_000;
	static readonly DEFAULT_CONCURRENCY = 3;
	static readonly DEFAULT_DEPTH = {
		minimum: 3,
		maximum: 10,
	};

	public events: EventEmitter<IpChannel.EventMap>;
	public logger?: Logger;
	public options: IpChannel.Options;
	public state: IpChannel.State = IpChannel.STATE.CLOSED;

	public addressTracker: AddressTracker;
	public bindings: BindingCache;
	public coordinators: Coordinators;
	public pendingRequests: PendingRequests;
	public protocol: Protocol;
	public udpTransport: UdpTransport;

	public healthcheckInterval?: NodeJS.Timeout;
	public isHealthchecking = false;

	/**
	 * Creates a new ipChannel network instance.
	 *
	 * @param options - Configuration including socket and networking parameters
	 *
	 */
	constructor(options: RequiredProperties<IpChannel.Options, "socket">) {
		this.udpTransport = new UdpTransport(options);

		const defaultOptions = {
			concurrency: IpChannel.DEFAULT_CONCURRENCY,
			depth: IpChannel.DEFAULT_DEPTH,
			healthcheckIntervalMs: IpChannel.DEFAULT_HEALTHCHECK_INTERVAL_MS,
			...options,
		};

		this.bindings = new BindingCache({
			...defaultOptions,
			udpTransport: this.udpTransport,
		});
		this.addressTracker = new AddressTracker({
			...defaultOptions,
			udpTransport: this.udpTransport,
			bindings: this.bindings,
			logger: this.logger,
		});
		this.coordinators = new Coordinators({
			expectedType: this.udpTransport.local.type,
		});
		this.pendingRequests = new PendingRequests({
			...defaultOptions,
			udpTransport: this.udpTransport,
		});
		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, `LAYER ${this.udpTransport.local.toString()}`);
		this.options = defaultOptions;
		this.protocol = new Protocol({
			...defaultOptions,
			udpTransport: this.udpTransport,
			addressTracker: this.addressTracker,
			bindings: this.bindings,
			pendingRequests: this.pendingRequests,
		});

		this.udpTransport.events.on("diceMessage", this.udpTransportListeners.diceMessageListener);

		this.addressTracker.events.on("address", this.addressTrackerListeners.addressListener);
		this.addressTracker.events.on("reachable", this.addressTrackerListeners.reachableListener);

		this.healthcheckInterval = setInterval(() => {
			this.healthcheck().catch((error: unknown) => {
				this.events.emit("error", error);
			});
		}, this.options.healthcheckIntervalMs);

		this.state = IpChannel.STATE.OPENED;
		this.events.emit("open");
		this.logger?.info("Open");
	}

	get address(): DiceAddress[AddressType] {
		return {
			address: this.addressTracker.external,
			coordinators: !this.addressTracker.isReachable ? this.coordinators.list() : undefined,
		} as DiceAddress[AddressType];
	}

	/**
	 * Closes an ipChannel network and cleans up resources.
	 *
	 * Stops healthcheck intervals, removes socket listeners, aborts pending
	 * response listeners, and emits the 'close' event.
	 */
	close(): void {
		if (this.state === IpChannel.STATE.CLOSED) return;

		this.logger?.info("Closing");

		clearInterval(this.healthcheckInterval);

		this.udpTransport.events.removeListener("diceMessage", this.udpTransportListeners.diceMessageListener);

		this.addressTracker.events.removeListener("address", this.addressTrackerListeners.addressListener);
		this.addressTracker.events.removeListener("reachable", this.addressTrackerListeners.reachableListener);

		this.udpTransport.close();
		this.protocol.close();
		this.pendingRequests.abortAll();

		this.state = IpChannel.STATE.CLOSED;
		this.events.emit("close");
		this.logger?.info("Closed");
	}

	/**
	 * Considers an address for addition to the coordinator pool.
	 * Pings the address to verify reachability, then adds if responsive.
	 *
	 * @param address - Address to consider as potential coordinator
	 */
	async handleAddress(address: Address): Promise<void> {
		if (this.state !== IpChannel.STATE.OPENED) {
			throw new DiceError("Cannot handle address: ipChannel is not opened");
		}

		if (!this.addressTracker.external) {
			return;
		}

		if (!this.addressTracker.isRemoteAddress(address) || !this.coordinators.isValidAddress(address, this.udpTransport.local.type)) {
			return;
		}

		try {
			await this.protocol.ping(address);

			const added = this.coordinators.tryAdd(address);

			if (added) {
				this.events.emit("address", this.addressTracker.external, !this.addressTracker.isReachable ? this.coordinators.list() : undefined);
			}
		} catch (error) {
			this.logger?.debug(`Failed to ping potential coordinator ${address.toString()}:`, error);
		}
	}

	/**
	 * Runs coordinator health checks to verify connectivity and remove dead peers.
	 *
	 * @returns Promise that resolves when health check cycle completes
	 */
	async healthcheck(): Promise<void> {
		if (this.state !== IpChannel.STATE.OPENED) {
			this.logger?.debug("Cannot healthcheck: ipChannel is not opened");
			return;
		}

		if (this.isHealthchecking) return;
		this.isHealthchecking = true; // Set immediately to prevent concurrent execution

		try {
			this.logger?.debug("Healthchecking");

			let removeCount = 0;

			const promises = this.coordinators.list().map(async (address) => {
				if (!this.addressTracker.external || !this.bindings.hasInboundBinding(address.key, this.addressTracker.external.key)) {
					try {
						await this.protocol.ping(address);
					} catch (error) {
						this.logger?.debug(`Coordinator ${address.toString()} failed healthcheck:`, error);
						this.coordinators.remove(address.key);

						removeCount++;
					}
				}
			});

			if (promises.length) await Promise.allSettled(promises);

			if (this.coordinators.size === 0) {
				this.coordinators.events.emit("depleted");
			}

			if (removeCount) {
				this.events.emit("address", this.addressTracker.external, !this.addressTracker.isReachable ? this.coordinators.list() : undefined);
			}
		} catch (error) {
			this.events.emit("error", error);
		} finally {
			this.logger?.debug("Healthchecking complete");
			this.isHealthchecking = false;
		}
	}

	addressTrackerListeners = {
		addressListener: (address: Address | undefined, isReachable: boolean) => {
			this.events.emit("address", address, !isReachable ? this.coordinators.list() : undefined);
		},
		reachableListener: (isReachable: boolean) => {
			this.events.emit("reachable", isReachable);
		},
	};

	udpTransportListeners = {
		diceMessageListener: (message: Message, context: UdpTransport.PayloadContext) => {
			this.protocol.handleMessage(message, context).catch((error: unknown) => {
				this.events.emit("error", error);
			});
		},
	};
}
