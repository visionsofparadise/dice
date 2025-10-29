import { RemoteInfo, Socket as UdpSocket } from "dgram";
import EventEmitter from "events";
import { defaults } from "lodash-es";
import { BOOTSTRAP_ADDRESS } from "../../utilities/bootstrapAddresses";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { BindingCache } from "../BindingCache";
import { Coordinators } from "../Coordinators";
import { EventEmitterOptions } from "../EventEmitter";
import { Message } from "../Message";
import { ResponseCorrelator, type AwaitResponseOptions as AwaitOverlayResponseOptions } from "../ResponseCorrelator";
import { closeOverlay } from "./methods/close";
import { handleOverlayAddress } from "./methods/handleAddress";
import { handleOverlayBindRequest } from "./methods/handleBindRequest";
import { handleOverlayBuffer } from "./methods/handleBuffer";
import { handleOverlayEnvelope } from "./methods/handleEnvelope";
import { handleOverlayMessage } from "./methods/handleMessage";
import { handleOverlayPing } from "./methods/handlePing";
import { handleOverlayReflection } from "./methods/handleReflection";
import { handleOverlayRelayBindRequest } from "./methods/handleRelayBindRequest";
import { healthcheckOverlay } from "./methods/healthcheck";
import { healthcheckOverlayCoordinators } from "./methods/healthcheckCoordinators";
import { initializeOverlay } from "./methods/initialize";
import { isValidOverlayAddress } from "./methods/isValidAddress";
import { openOverlay } from "./methods/open";
import { sendOverlay, SendOverlayOptions } from "./methods/send";
import { sendOverlayBindRequest } from "./methods/sendBindRequest";
import { sendOverlayNoop } from "./methods/sendNoop";
import { sendOverlayPing } from "./methods/sendPing";

export namespace Layer {
	export interface EventMap {
		address: [address?: Address, coordinators?: Array<Address>];
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		close: [];
		coordinatorPoolDepleted: [];
		envelope: [envelope: import("../Envelope").Envelope, context: Layer.Context];
		error: [error: unknown];
		message: [buffer: Uint8Array, context: Layer.Context];
		diceMessage: [message: Message, context: Layer.Context];
		open: [];
	}

	export interface Options extends AwaitOverlayResponseOptions, SendOverlayOptions, EventEmitterOptions {
		isAddressValidationDisabled?: boolean;
		isPrefixFilteringDisabled?: boolean;
		bindInTtlMs: number;
		bindOutTtlMs: number;
		bootstrapAddresses: Array<Address>;
		cacheSize: number;
		concurrency: number;
		coordinatorCount: number;
		depth: {
			minimum: number;
			maximum: number;
		};
		excludeFromCoordinators?: Set<string>;
		filterMessage?: (message: Message, remoteAddress: Address) => boolean;
		healthcheckIntervalMs: number;
		logger?: Logger;
		reachableWindowMs: number;
		socket: Layer.Socket;
	}

	export interface Context {
		buffer: Uint8Array;
		envelope?: import("../Envelope").Envelope;
		layer: Layer;
		remoteInfo: RemoteInfo;
		remoteAddress: Address;
	}

	export type Socket = Pick<UdpSocket, "address" | "close" | "on" | "removeListener" | "send" | "unref">;

	export type State = 0 | 1;
}

/**
 * Single-stack layer network for DICE protocol implementation.
 *
 * Manages peer discovery, NAT traversal, and direct UDP messaging for either
 * IPv4 or IPv6. Maintains pools of coordinator and candidate peers, handles
 * external address detection through reflection, and coordinates hole punching
 * for NAT traversal.
 *
 * @example
 * ```typescript
 * const layer = new Layer({
 *   socket,
 *   bootstrapAddresses: BOOTSTRAP_ADDRESS[AddressType.IPv4]
 * });
 *
 * await layer.open();
 * console.log("External address:", layer.external?.toString());
 * ```
 */
export class Layer {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public options: Layer.Options;
	public socket: Layer.Socket;
	public events: EventEmitter<Layer.EventMap>;
	public logger?: Logger;

	public state: Layer.State = Layer.STATE.CLOSED;
	public local: Address;
	public external?: Address;
	public lastUnsolicitedAt: number = 0;

	public bindings: BindingCache;
	public coordinators: Coordinators;
	public correlator: ResponseCorrelator;
	public reflection = new Map<string, Address>();

	public healthcheckInterval?: NodeJS.Timeout;
	public isHealthchecking = false;

	/**
	 * Creates a new layer network instance.
	 *
	 * @param options - Configuration including socket and networking parameters
	 *
	 */
	constructor(options: RequiredProperties<Layer.Options, "socket">) {
		const local = Address.fromAddressInfo(options.socket.address());

		const defaultOptions = defaults(options, {
			isPrefixFilteringDisabled: false,
			bindInTtlMs: 25_000,
			bindOutTtlMs: 20_000,
			bootstrapAddresses: BOOTSTRAP_ADDRESS[local.type],
			cacheSize: 10_000,
			concurrency: 3,
			coordinatorCount: 9,
			depth: {
				minimum: 3,
				maximum: 10,
			},
			healthcheckIntervalMs: 60_000,
			reachableWindowMs: 60_000,
		});

		this.bindings = new BindingCache(defaultOptions.bindInTtlMs, defaultOptions.bindOutTtlMs, defaultOptions.cacheSize);
		this.coordinators = new Coordinators();
		this.correlator = new ResponseCorrelator();
		this.events = new EventEmitter(defaultOptions);
		this.local = local;
		this.logger = wrapLogger(defaultOptions.logger, `OVERLAY ${this.local.toString()}`);
		this.options = defaultOptions;
		this.socket = defaultOptions.socket;
	}

	get isNotCandidate(): boolean {
		return this.external?.isPrivate || this.isSymmetric;
	}

	get isReachable(): boolean {
		return Date.now() - this.lastUnsolicitedAt < this.options.reachableWindowMs;
	}

	get isPublic(): boolean {
		return this.isReachable;
	}

	get isSymmetric(): boolean {
		return !this.external && this.reflection.size === 2;
	}

	/**
	 * Opens an layer network and begins peer discovery.
	 *
	 * Sets up socket listeners, starts healthcheck intervals, and optionally
	 * bootstraps from the network by discovering initial coordinators.
	 *
	 * @param isBootstrapping - Whether to bootstrap (default: true)
	 * @returns Promise that resolves when layer is operational
	 */
	open = openOverlay.bind(this, this);

	/**
	 * Closes an layer network and cleans up resources.
	 *
	 * Stops healthcheck intervals, removes socket listeners, aborts pending
	 * response listeners, and emits the 'close' event.
	 */
	close = closeOverlay.bind(this, this);

	initialize = initializeOverlay.bind(this, this);

	/**
	 * Sends a UDP message to a specific network address.
	 *
	 * @param address - Target network address to send to
	 * @param buffer - Message data to send
	 * @param options - Optional retry count and abort signal
	 * @returns Promise that resolves when message is sent (or retries exhausted)
	 */
	send = sendOverlay.bind(this, this);

	/**
	 * Sends a no-operation message to create NAT binding.
	 *
	 * @param address - Target address to establish NAT binding with
	 * @returns Promise that resolves when noop is sent
	 */
	noop = sendOverlayNoop.bind(this, this);

	/**
	 * Sends a ping message and waits for a pong response.
	 *
	 * @param address - Target address to ping
	 * @param body - Optional additional ping body data
	 * @param options - Optional timeout and retry configuration
	 * @returns Promise that resolves when pong is received
	 * @throws When ping times out or target is unreachable
	 */
	ping = sendOverlayPing.bind(this, this);

	/**
	 * Requests a list of known addresses from a peer.
	 *
	 * @param address - Target address to query for addresses
	 * @param body - Optional additional list request data
	 * @param options - Optional timeout and retry configuration
	 * @returns Promise resolving to array of addresses from the peer
	 * @throws When request times out or peer doesn't respond
	 */

	/**
	 * Requests NAT traversal coordination through relay peers.
	 *
	 * Implements the DICE hole punching protocol by:
	 * 1. Sending a noop to create outbound NAT binding
	 * 2. Requesting coordinators to signal the target peer
	 * 3. Waiting for the target to initiate contact using our NAT binding
	 *
	 * This enables direct connectivity between peers behind different NATs.
	 *
	 * @param address - Target address we want to establish connectivity with
	 * @param coordinators - Relay addresses that can coordinate the connection
	 * @param body - Optional additional bind request data
	 * @param options - Optional timeout and retry configuration
	 * @returns Promise that resolves when direct connectivity is established
	 * @throws {DiceError} When no coordinators available or bind fails
	 */
	requestBind = sendOverlayBindRequest.bind(this, this);

	handleBuffer = handleOverlayBuffer.bind(this, this);
	handleEnvelope = handleOverlayEnvelope.bind(this, this);
	handleMessage = handleOverlayMessage.bind(this, this);
	handlePing = handleOverlayPing.bind(this, this);
	handleBindRequest = handleOverlayBindRequest.bind(this, this);
	handleRelayBindRequest = handleOverlayRelayBindRequest.bind(this, this);

	/**
	 * Handles several critical functions:
	 * - Updates reachability status when receiving unsolicited messages
	 * - Manages NAT binding cache for successful connections
	 * - Adds/removes peers from candidate pool based on connectivity flags
	 * - Enforces candidate pool size limits with FIFO eviction
	 *
	 * @param address - Source address of the incoming message
	 * @param message - The message received (contains connectivity flags)
	 */
	handleAddress = handleOverlayAddress.bind(this, this);

	/**
	 * Processes external address reflections to detect NAT type and external IP.
	 *
	 * @param remoteAddress - Address of the peer providing the reflection
	 * @param reflectionAddress - The external address this peer observed
	 */
	handleReflection = handleOverlayReflection.bind(this, this);

	/**
	 * Discovers new coordinator addresses through iterative network exploration.
	 *
	 * @param count - Maximum number of addresses to discover
	 * @param excludedPrefixes - Set of IP prefixes to avoid (prevents duplicates)
	 * @returns Promise resolving to array of discovered addresses, sorted by latency
	 */

	/**
	 * Runs candidate and coordinator health checks in parallel to verify
	 * connectivity and remove dead peers.
	 *
	 * @returns Promise that resolves when health check cycle completes
	 */
	healthcheck = healthcheckOverlay.bind(this, this);
	healthcheckCoordinators = healthcheckOverlayCoordinators.bind(this, this);

	isValidAddress = isValidOverlayAddress.bind(this, this);

	overlayListeners = {
		diceMessageListener: (message: Message, context: Layer.Context) => {
			this.handleMessage(message, context);
		},
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	socketListeners = {
		messageListener: (message: Uint8Array, remoteInfo: RemoteInfo) => {
			this.handleBuffer(message, {
				remoteInfo,
			});
		},
	};
}
