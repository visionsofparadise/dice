import { sampleSize } from "lodash-es";
import { isValidPublicAddress } from "../../utilities/isValidPublicAddress";
import { type Logger, wrapLogger } from "../../utilities/Logger";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import type { Address } from "../Address";
import type { AddressTracker } from "../AddressTracker";
import type { BindingCache } from "../BindingCache";
import { DiceError } from "../Error";
import { Message } from "../Message";
import { MessageBodyType, type PingBody, type RelayBindRequestBody } from "../Message/BodyCodec";
import type { AwaitResponseOptions, PendingRequests } from "../PendingRequests";
import { createTransactionId } from "../TransactionId/Codec";
import type { UdpTransport } from "../UdpTransport";

export namespace Protocol {
	export interface Options {
		addressTracker: AddressTracker;
		bindings: BindingCache;
		concurrency?: number;
		logger?: Logger;
		pendingRequests: PendingRequests;
		udpTransport: UdpTransport;
	}

	export type State = 0 | 1;
}

/**
 * Handles DICE protocol message operations and responses.
 *
 * Coordinates NAT traversal operations (noop, ping, bind requests) and
 * dispatches incoming protocol messages to appropriate handlers. Manages
 * protocol state and validation for secure relay operations.
 *
 * @example
 * ```typescript
 * const protocol = new Protocol({
 *   addressTracker,
 *   bindings,
 *   correlator,
 *   udpTransport
 * });
 *
 * await protocol.ping(targetAddress);
 * await protocol.requestBind(targetAddress, coordinators);
 * ```
 */
export class Protocol {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_CONCURRENCY = 3;

	public addressTracker: AddressTracker;
	public bindings: BindingCache;
	public logger?: Logger;
	public options: Protocol.Options;
	public pendingRequests: PendingRequests;
	public state: Protocol.State = Protocol.STATE.CLOSED;
	public udpTransport: UdpTransport;

	constructor(options: RequiredProperties<Protocol.Options, "addressTracker" | "bindings" | "pendingRequests" | "udpTransport">) {
		this.options = {
			concurrency: Protocol.DEFAULT_CONCURRENCY,
			...options,
		};

		this.udpTransport = options.udpTransport;

		this.addressTracker = options.addressTracker;
		this.bindings = options.bindings;
		this.logger = wrapLogger(options.logger, `PROTOCOL ${this.udpTransport.local.toString()}`);
		this.pendingRequests = options.pendingRequests;

		this.state = Protocol.STATE.OPENED;
		this.logger?.info("Open");
	}

	/**
	 * Closes the controller and cleans up resources.
	 */
	close(): void {
		if (this.state === Protocol.STATE.CLOSED) return;

		this.logger?.info("Closing");
		this.state = Protocol.STATE.CLOSED;
		this.logger?.info("Closed");
	}

	/**
	 * Dispatches incoming protocol messages to appropriate handlers.
	 *
	 * @param message - Protocol message to handle
	 * @param context - Message context with source address
	 */
	async handleMessage(message: Message, context: UdpTransport.Context): Promise<void> {
		this.logger?.debug(`Handling message ${message.body.type} from ${context.remoteAddress.toString()}`);

		switch (message.body.type) {
			case MessageBodyType.NOOP:
				break;
			case MessageBodyType.PING: {
				await this.handlePing(message as Message<MessageBodyType.PING>, context);
				break;
			}
			case MessageBodyType.RELAY_BIND_REQUEST: {
				await this.handleRelayBindRequest(message as Message<MessageBodyType.RELAY_BIND_REQUEST>, context);
				break;
			}
			case MessageBodyType.BIND_REQUEST: {
				await this.handleBindRequest(message as Message<MessageBodyType.BIND_REQUEST>);
				break;
			}
		}
	}

	/**
	 * Sends a no-operation message to create NAT binding.
	 *
	 * @param address - Target address to establish NAT binding with
	 * @returns Promise that resolves when noop is sent
	 */
	async noop(address: Address): Promise<void> {
		if (this.state !== Protocol.STATE.OPENED) {
			throw new DiceError("Cannot send noop: controller is not opened");
		}

		const request = new Message({
			body: {
				type: MessageBodyType.NOOP,
			},
		});

		await this.udpTransport.send(request.buffer, address);
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
		if (this.state !== Protocol.STATE.OPENED) {
			throw new DiceError("Cannot ping: controller is not opened");
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
			this.udpTransport.send(request.buffer, address, { ...options, signal: abortController.signal }),
			this.pendingRequests.awaitResponse(
				{
					source: {
						address,
					},
					body: {
						type: MessageBodyType.PONG,
						transactionId: request.body.transactionId,
					},
				},
				{ ...this.pendingRequests.options, ...options, sendAbortController: abortController },
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
		if (coordinators.length === 0) {
			throw new DiceError(`No coordinators available for ${address.toString()}`);
		}

		if (this.state !== Protocol.STATE.OPENED) {
			throw new DiceError("Cannot bind: controller is not opened");
		}

		const sampleCoordinators = sampleSize(coordinators, this.options.concurrency);

		if (!sampleCoordinators.length) throw new DiceError("No relay addresses to bind request through");

		if (!this.addressTracker.external || !this.bindings.hasOutboundBinding(this.addressTracker.external.key, address.key)) {
			await this.noop(address);
		}

		if (this.addressTracker.external && this.bindings.hasInboundBinding(address.key, this.addressTracker.external.key)) return;

		const request = new Message({
			body: {
				type: MessageBodyType.RELAY_BIND_REQUEST,
				transactionId: createTransactionId(),
				targetAddress: address,
				...body,
			},
		});

		const abortController = new AbortController();

		const sendPromises = sampleCoordinators.map(async (coordinator) => this.udpTransport.send(request.buffer, coordinator, { ...options, signal: abortController.signal }));

		const responsePromise = this.pendingRequests.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.BIND,
					transactionId: request.body.transactionId,
				},
			},
			{ ...this.pendingRequests.options, ...options, sendAbortController: abortController },
		);

		const results = await Promise.allSettled([Promise.allSettled(sendPromises), responsePromise]);

		const responseResult = results[1];
		if (responseResult.status === "rejected") {
			throw responseResult.reason;
		}
	}

	private async handlePing(request: Message<MessageBodyType.PING>, context: UdpTransport.Context): Promise<void> {
		if (this.state !== Protocol.STATE.OPENED) return;

		const response = new Message({
			body: {
				type: MessageBodyType.PONG,
				transactionId: request.body.transactionId,
				reflectionAddress: context.remoteAddress,
			},
		});

		await this.udpTransport.send(response.buffer, context.remoteAddress);
	}

	private async handleBindRequest(request: Message<MessageBodyType.BIND_REQUEST>): Promise<void> {
		if (this.state !== Protocol.STATE.OPENED) return;

		const response = new Message({
			body: {
				type: MessageBodyType.BIND,
				transactionId: request.body.transactionId,
			},
		});

		await this.udpTransport.send(response.buffer, request.body.sourceAddress);
	}

	private async handleRelayBindRequest(request: Message<MessageBodyType.RELAY_BIND_REQUEST>, context: UdpTransport.Context): Promise<void> {
		if (this.state !== Protocol.STATE.OPENED) return;
		if (context.remoteAddress.type !== request.body.targetAddress.type) return;

		if (!this.addressTracker.options.isAddressValidationDisabled && !isValidPublicAddress(request.body.targetAddress)) {
			this.logger?.debug("Rejected relay bind request: invalid target address");

			return;
		}

		if (this.bindings.hasRecentRelayBind(context.remoteAddress.key, request.body.targetAddress.key)) {
			this.logger?.debug("Rejected relay bind request: recent relay bind exists");

			return;
		}

		this.bindings.recordRelayBind(context.remoteAddress.key, request.body.targetAddress.key);

		const nextRequest = new Message({
			body: {
				type: MessageBodyType.BIND_REQUEST,
				transactionId: request.body.transactionId,
				sourceAddress: context.remoteAddress,
			},
		});

		await this.udpTransport.send(nextRequest.buffer, request.body.targetAddress);
	}
}
