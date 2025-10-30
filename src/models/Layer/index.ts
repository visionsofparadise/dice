import { RemoteInfo } from "dgram";
import EventEmitter from "events";
import { sampleSize } from "lodash-es";
import { BOOTSTRAP_ADDRESS } from "../../utilities/bootstrapAddresses";
import { isValidPublicAddress } from "../../utilities/isValidPublicAddress";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Adapter } from "../Adapter";
import { Address } from "../Address";
import { AddressState } from "../AddressState";
import { BindingCache } from "../BindingCache";
import { Coordinators } from "../Coordinators";
import { DiceError } from "../Error";
import { Envelope } from "../Envelope";
import { EventEmitterOptions } from "../EventEmitter";
import { Message } from "../Message";
import { MessageBodyType, PingBody, RelayBindRequestBody } from "../Message/BodyCodec";
import { AwaitResponseOptions, ResponseCorrelator } from "../ResponseCorrelator";
import { createTransactionId } from "../TransactionId/Codec";

export namespace Layer {
	export interface EventMap {
		address: [address?: Address, coordinators?: Array<Address>];
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		close: [];
		coordinatorPoolDepleted: [];
		diceMessage: [message: Message, context: Adapter.PayloadContext];
		envelope: [envelope: Envelope, context: Adapter.Context];
		error: [error: unknown];
		message: [payload: Uint8Array, context: Adapter.PayloadContext];
		open: [];
	}

	export interface Options extends RequiredProperties<Adapter.Options, "socket">, Partial<BindingCache.Options>, Partial<ResponseCorrelator.Options>, EventEmitterOptions {
		bootstrapAddresses?: Array<Address>;
		concurrency?: number;
		healthcheckIntervalMs?: number;
		isAddressValidationDisabled?: boolean;
		isPrefixFilteringDisabled?: boolean;
		logger?: Logger;
	}

	export type Context = Adapter.Context;
	export type PayloadContext = Adapter.PayloadContext;
	export type State = 0 | 1;
}

/**
 * Single-stack layer network for DICE protocol implementation.
 *
 * Manages peer discovery, NAT traversal, and direct UDP messaging for either
 * IPv4 or IPv6. Maintains coordinator pools, handles external address detection
 * through reflection, and coordinates hole punching for NAT traversal.
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

	static readonly DEFAULT_HEALTHCHECK_INTERVAL_MS = 60_000;
	static readonly DEFAULT_CONCURRENCY = 3;
	static readonly DEFAULT_DEPTH = {
		minimum: 3,
		maximum: 10,
	};

	public events: EventEmitter<Layer.EventMap>;
	public logger?: Logger;
	public options: Layer.Options;
	public state: Layer.State = Layer.STATE.CLOSED;

	public adapter: Adapter;
	public addressState: AddressState;
	public bindings: BindingCache;
	public coordinators: Coordinators;
	public correlator: ResponseCorrelator;

	public healthcheckInterval?: NodeJS.Timeout;
	public isHealthchecking = false;

	/**
	 * Creates a new layer network instance.
	 *
	 * @param options - Configuration including socket and networking parameters
	 *
	 */
	constructor(options: RequiredProperties<Layer.Options, "socket">) {
		this.adapter = new Adapter(options);

		const defaultOptions = {
			bootstrapAddresses: BOOTSTRAP_ADDRESS[this.adapter.local.type],
			concurrency: Layer.DEFAULT_CONCURRENCY,
			depth: Layer.DEFAULT_DEPTH,
			healthcheckIntervalMs: Layer.DEFAULT_HEALTHCHECK_INTERVAL_MS,
			...options,
		};

		this.bindings = new BindingCache({
			...defaultOptions,
			adapter: this.adapter,
		});
		this.addressState = new AddressState({
			...defaultOptions,
			adapter: this.adapter,
			bindings: this.bindings,
			logger: this.logger,
		});
		this.coordinators = new Coordinators();
		this.correlator = new ResponseCorrelator({
			...defaultOptions,
			adapter: this.adapter,
		});
		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, `OVERLAY ${this.adapter.local.toString()}`);
		this.options = defaultOptions;

		this.adapter.events.on("buffer", this.adapterListeners.bufferListener);
		this.adapter.events.on("envelope", this.adapterListeners.envelopeListener);
		this.adapter.events.on("message", this.adapterListeners.messageListener);
		this.adapter.events.on("diceMessage", this.adapterListeners.diceMessageListener);

		this.addressState.events.on("address", this.addressStateListeners.addressListener);

		this.coordinators.events.on("depleted", this.coordinatorListeners.depletedListener);

		this.healthcheckInterval = setInterval(() => {
			this.healthcheck().catch((error) => {
				this.events.emit("error", error);
			});
		}, this.options.healthcheckIntervalMs);

		this.state = Layer.STATE.OPENED;
		this.events.emit("open");
		this.logger?.info("Open");
	}

	/**
	 * Closes an layer network and cleans up resources.
	 *
	 * Stops healthcheck intervals, removes socket listeners, aborts pending
	 * response listeners, and emits the 'close' event.
	 */
	close(): void {
		if (this.state === Layer.STATE.CLOSED) return;

		this.logger?.info("Closing");

		clearInterval(this.healthcheckInterval);

		this.adapter.events.removeListener("buffer", this.adapterListeners.bufferListener);
		this.adapter.events.removeListener("envelope", this.adapterListeners.envelopeListener);
		this.adapter.events.removeListener("message", this.adapterListeners.messageListener);
		this.adapter.events.removeListener("diceMessage", this.adapterListeners.diceMessageListener);

		this.addressState.events.removeListener("address", this.addressStateListeners.addressListener);

		this.coordinators.events.removeListener("depleted", this.coordinatorListeners.depletedListener);

		this.adapter.close();
		this.correlator.abortAll();

		this.state = Layer.STATE.CLOSED;
		this.events.emit("close");
		this.logger?.info("Closed");
	}

	/**
	 * Gets the external address for this layer.
	 * Delegates to addressState.external.
	 *
	 * @returns External address or undefined if not yet discovered
	 */
	get external(): Address | undefined {
		return this.addressState.external;
	}

	/**
	 * Checks if this layer is publicly reachable.
	 * Delegates to addressState.isReachable.
	 *
	 * @returns true if publicly reachable (received unsolicited traffic recently)
	 */
	get isReachable(): boolean {
		return this.addressState.isReachable;
	}

	/**
	 * Sends a no-operation message to create NAT binding.
	 *
	 * @param address - Target address to establish NAT binding with
	 * @returns Promise that resolves when noop is sent
	 */
	async noop(address: Address): Promise<void> {
		if (this.state !== Layer.STATE.OPENED) {
			throw new DiceError("Cannot send noop: layer is not opened");
		}

		const request = new Message({
			body: {
				type: MessageBodyType.NOOP,
			},
		});

		await this.adapter.send(request.buffer, address);
	}

	/**
	 * Sends a ping message and waits for a pong response.
	 *
	 * @param address - Target address to ping
	 * @param body - Optional additional ping body data
	 * @param options - Optional timeout and retry configuration
	 * @returns Promise that resolves when pong is received
	 * @throws When ping times out or target is unreachable
	 */
	async ping(address: Address, body?: Partial<PingBody>, options?: AwaitResponseOptions): Promise<void> {
		if (this.state !== Layer.STATE.OPENED) {
			throw new DiceError("Cannot ping: layer is not opened");
		}

		const request = new Message({
			body: {
				type: MessageBodyType.PING,
				transactionId: createTransactionId(),
				...body,
			},
		});

		const abortController = new AbortController();

		await Promise.all([
			this.adapter.send(request.buffer, address, { ...options, signal: abortController.signal }),
			this.correlator.awaitResponse(
				{
					source: {
						address,
					},
					body: {
						type: MessageBodyType.PONG,
						transactionId: request.body.transactionId,
					},
				},
				{ ...this.options, ...options, sendAbortController: abortController }
			),
		]);
	}

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
	async requestBind(address: Address, coordinators: Array<Address>, body?: Partial<RelayBindRequestBody>, options?: AwaitResponseOptions): Promise<void> {
		if (!address) throw new DiceError("Invalid bind request target address");
		if (!coordinators || coordinators.length === 0) {
			throw new DiceError(`No coordinators available for ${address.toString()}`);
		}

		if (this.state !== Layer.STATE.OPENED) {
			throw new DiceError("Cannot bind: layer is not opened");
		}

		const sampleCoordinators = sampleSize(coordinators, this.options.concurrency);

		if (!sampleCoordinators.length) throw new DiceError("No relay addresses to bind request through");

		if (!this.addressState.external || !this.bindings.hasOutboundBinding(this.addressState.external.key, address.key)) {
			await this.noop(address);
		}

		if (this.addressState.external && this.bindings.hasInboundBinding(address.key, this.addressState.external.key)) return;

		const request = new Message({
			body: {
				type: MessageBodyType.RELAY_BIND_REQUEST,
				transactionId: createTransactionId(),
				targetAddress: address,
				...body,
			},
		});

		const abortController = new AbortController();

		const sendPromises = sampleCoordinators.map(async (coordinator) => {
			return this.adapter.send(request.buffer, coordinator, { ...options, signal: abortController.signal });
		});

		const responsePromise = this.correlator.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.BIND,
					transactionId: request.body.transactionId,
				},
			},
			{ ...this.options, ...options, sendAbortController: abortController }
		);

		const results = await Promise.allSettled([Promise.allSettled(sendPromises), responsePromise]);

		const responseResult = results[1];
		if (responseResult.status === "rejected") {
			throw responseResult.reason;
		}
	}

	async handleMessage(message: Message, context: Adapter.Context): Promise<void> {
		try {
			this.logger?.debug(`Handling message ${message.body.type} from ${context.remoteAddress.toString()}`);

			switch (message.body.type) {
				case MessageBodyType.NOOP:
					break;
				case MessageBodyType.PING: {
					this.handlePing(message as Message<MessageBodyType.PING>, context);

					break;
				}
				case MessageBodyType.RELAY_BIND_REQUEST: {
					this.handleRelayBindRequest(message as Message<MessageBodyType.RELAY_BIND_REQUEST>, context);

					break;
				}
				case MessageBodyType.BIND_REQUEST: {
					this.handleBindRequest(message as Message<MessageBodyType.BIND_REQUEST>);

					break;
				}
			}
		} catch (error) {
			this.events.emit("error", error);
		}
	}

	async handlePing(request: Message<MessageBodyType.PING>, context: Adapter.Context): Promise<void> {
		if (this.state !== Layer.STATE.OPENED) return;

		const response = new Message({
			body: {
				type: MessageBodyType.PONG,
				transactionId: request.body.transactionId,
				reflectionAddress: context.remoteAddress,
			},
		});

		await this.adapter.send(response.buffer, context.remoteAddress);
	}

	async handleBindRequest(request: Message<MessageBodyType.BIND_REQUEST>): Promise<void> {
		if (this.state !== Layer.STATE.OPENED) return;

		const response = new Message({
			body: {
				type: MessageBodyType.BIND,
				transactionId: request.body.transactionId,
			},
		});

		await this.adapter.send(response.buffer, request.body.sourceAddress);
	}

	async handleRelayBindRequest(request: Message<MessageBodyType.RELAY_BIND_REQUEST>, context: Adapter.Context): Promise<void> {
		if (this.state !== Layer.STATE.OPENED) return;
		if (context.remoteAddress.type !== request.body.targetAddress.type) return;

		if (!this.addressState.options.isAddressValidationDisabled && !isValidPublicAddress(request.body.targetAddress)) {
			this.logger?.debug("Rejected relay bind request: invalid target address");
			return;
		}

		// Check if we've recently relayed a bind for this source-target pair to prevent amplification attacks
		if (this.bindings.hasRecentRelayBind(context.remoteAddress.key, request.body.targetAddress.key)) {
			this.logger?.debug("Rejected relay bind request: recent relay bind exists");
			return;
		}

		// Record this relay bind to prevent repeat requests
		this.bindings.recordRelayBind(context.remoteAddress.key, request.body.targetAddress.key);

		const nextRequest = new Message({
			body: {
				type: MessageBodyType.BIND_REQUEST,
				transactionId: request.body.transactionId,
				sourceAddress: context.remoteAddress,
			},
		});

		await this.adapter.send(nextRequest.buffer, request.body.targetAddress);
	}

	/**
	 * Handles several critical functions:
	 * - Updates reachability status when receiving unsolicited messages
	 * - Manages NAT binding cache for successful connections
	 * - Discovers and adds coordinators based on connectivity
	 *
	 * @param address - Source address of the incoming message
	 */
	async handleAddress(address: Address): Promise<void> {
		// Direct coordinator testing: add peers from application traffic
		// If we received from a peer without existing binding, pool not full, and peer is valid
		const noExistingBinding = this.addressState.external && !this.bindings.hasOutboundBinding(this.addressState.external.key, address.key);

		if (this.addressState.isRemoteAddress(address) && this.coordinators.isValidAddress(address) && noExistingBinding) {
			try {
				await this.ping(address);

				const added = this.coordinators.tryAdd(address);
				if (added) {
					this.events.emit("address", this.addressState.external, !this.addressState.isReachable ? this.coordinators.list() : undefined);
				}
			} catch (error) {
				this.logger?.debug(`Failed to ping potential coordinator ${address.toString()}:`, error);
				return;
			}
		}
	}

	/**
	 * Runs coordinator health checks to verify connectivity and remove dead peers.
	 *
	 * @returns Promise that resolves when health check cycle completes
	 */
	async healthcheck(): Promise<void> {
		if (this.isHealthchecking) return;
		this.isHealthchecking = true; // Set immediately to prevent concurrent execution

		try {
			this.logger?.debug("Healthchecking");

			let removeCount = 0;

			const promises = this.coordinators.list().map(async (address) => {
				if (!this.addressState.external || !this.bindings.hasInboundBinding(address.key, this.addressState.external.key)) {
					try {
						await this.ping(address);
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
				this.events.emit("address", this.addressState.external, !this.addressState.isReachable ? this.coordinators.list() : undefined);
			}
		} catch (error) {
			this.events.emit("error", error);
		} finally {
			this.logger?.debug("Healthchecking complete");
			this.isHealthchecking = false;
		}
	}

	adapterListeners = {
		bufferListener: (buffer: Uint8Array, remoteInfo: RemoteInfo) => {
			this.events.emit("buffer", buffer, remoteInfo);
		},
		envelopeListener: (envelope: Envelope, context: Adapter.Context) => {
			try {
				this.events.emit("envelope", envelope, context);
				this.handleAddress(context.remoteAddress);
			} catch (error) {
				this.events.emit("error", error);
			}
		},
		messageListener: (payload: Uint8Array, context: Adapter.PayloadContext) => {
			this.events.emit("message", payload, context);
		},
		diceMessageListener: (message: Message, context: Adapter.PayloadContext) => {
			try {
				this.events.emit("diceMessage", message, context);
				this.handleMessage(message, context);
			} catch (error) {
				this.events.emit("error", error);
			}
		},
	};

	addressStateListeners = {
		addressListener: (address: Address | undefined, isReachable: boolean) => {
			this.events.emit("address", address, !isReachable ? this.coordinators.list() : undefined);
		},
	};

	coordinatorListeners = {
		depletedListener: () => {
			this.events.emit("coordinatorPoolDepleted");
		},
	};
}
