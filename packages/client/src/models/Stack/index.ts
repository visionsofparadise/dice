import { defaults } from "lodash-es";
import { RemoteInfo } from "dgram";
import EventEmitter from "events";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { AddressType } from "../Address/Type";
import { DiceAddress } from "../DiceAddress";
import { EventEmitterOptions } from "../EventEmitter";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { Layer } from "../Layer";
import { SendOverlayOptions } from "../Layer/methods/send";
import { closeClient } from "./methods/close";
import { openClient } from "./methods/open";
import { requestClientBind } from "./methods/requestBind";
import { sendClient } from "./methods/send";

export namespace Stack {
	export interface EventMap {
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		close: [];
		coordinatorPoolDepleted: [];
		diceAddress: [diceAddress: DiceAddress];
		envelope: [envelope: import("../Envelope").Envelope, context: Layer.Context];
		error: [error: unknown];
		message: [buffer: Uint8Array, context: Layer.Context];
		diceMessage: [message: import("../Message").Message, context: Layer.Context];
		open: [];
	}

	export interface Options extends SendOverlayOptions, EventEmitterOptions {
		[AddressType.IPv6]?: RequiredProperties<Layer.Options, "socket">;
		[AddressType.IPv4]?: RequiredProperties<Layer.Options, "socket">;
		cacheSize: number;
		concurrency: number;
		depth: {
			minimum: number;
			maximum: number;
		};
		healthcheckIntervalMs: number;
		logger?: Logger;
	}

	export type State = 0 | 1;
}

/**
 * DICE Stack for peer-to-peer networking without infrastructure dependencies.
 *
 * Manages dual-stack IPv4/IPv6 layers and provides a high-level interface for:
 * - Generating your own DICE addresses
 * - Sending messages to others' DICE addresses
 * - Automatic NAT traversal and connectivity handling
 *
 * @example
 * ```typescript
 * const stack = new Stack({
 *   [AddressType.IPv4]: { socket: ipv4Socket },
 *   [AddressType.IPv6]: { socket: ipv6Socket }
 * });
 *
 * await stack.open();
 * console.log("My address:", stack.diceAddress.toString());
 *
 * stack.on("diceaddress", (diceaddress) => {
 *   console.log(diceAddress.toString());
 * });
 *
 * await stack.send(targetAddress, messageBuffer);
 * ```
 */
export class Stack {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	/**
	 * Event emitter for stack lifecycle and network events.
	 *
	 * Available events:
	 * - `open`: Emitted when stack successfully opens and is ready to send/receive
	 * - `close`: Emitted when stack closes and all connections are terminated
	 * - `diceAddress`: Emitted when the DICE address changes (external IP discovered, coordinators updated)
	 * - `message`: Emitted when receiving application-layer messages from other peers
	 * - `error`: Emitted when errors occur during network operations
	 *
	 * @example
	 * ```typescript
	 * stack.events.on('open', () => {
	 *   console.log('Stack is ready');
	 * });
	 *
	 * stack.events.on('diceAddress', (diceAddress) => {
	 *   console.log('My address:', diceAddress.toString());
	 * });
	 *
	 * stack.events.on('message', (message, remoteInfo) => {
	 *   console.log('Received:', message);
	 * });
	 * ```
	 */
	public events: EventEmitter<Stack.EventMap>;
	public logger?: Logger;
	public options: Stack.Options;
	public layers: {
		[AddressType.IPv6]?: Layer;
		[AddressType.IPv4]?: Layer;
	};
	public state: Stack.State = Stack.STATE.CLOSED;

	/**
	 * Creates a new DICE stack for P2P networking.
	 *
	 * The stack manages dual-stack IPv4/IPv6 layers for maximum connectivity.
	 * At minimum, provide at least one socket (IPv4 or IPv6). For best results,
	 * provide both to enable dual-stack operation.
	 *
	 * @param options - Configuration options
	 * @param options[AddressType.IPv4] - IPv4 configuration with UDP socket
	 * @param options[AddressType.IPv6] - IPv6 configuration with UDP socket
	 * @param options.cacheSize - Maximum cache entries for NAT bindings (default: 10,000)
	 * @param options.concurrency - Concurrent operations during peer discovery (default: 3)
	 * @param options.depth - Min/max depth for iterative peer discovery (default: {minimum: 3, maximum: 10})
	 * @param options.healthcheckIntervalMs - Interval between health checks in ms (default: 60,000)
	 * @param options.logger - Optional logger instance for debugging
	 *
	 * @example
	 * ```typescript
	 * import { createSocket } from 'dgram';
	 * import { Stack } from '@xkore/dice';
	 * import { AddressType } from '@xkore/dice/models/Address';
	 *
	 * // Dual-stack stack (recommended)
	 * const stack = new Stack({
	 *   [AddressType.IPv4]: { socket: createSocket('udp4') },
	 *   [AddressType.IPv6]: { socket: createSocket('udp6') }
	 * });
	 *
	 * // Single-stack IPv4 only
	 * const ipv4Client = new Stack({
	 *   [AddressType.IPv4]: { socket: createSocket('udp4') }
	 * });
	 * ```
	 */
	constructor(options?: Partial<Stack.Options>) {
		const defaultOptions = defaults(options, {
			cacheSize: 10_000,
			concurrency: 3,
			depth: {
				minimum: 3,
				maximum: 10,
			},
			healthcheckIntervalMs: 60_000,
		});

		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, "DICE");
		this.options = defaultOptions;
		this.layers = {
			[AddressType.IPv6]: defaultOptions[AddressType.IPv6]
				? new Layer({
						...defaultOptions,
						...defaultOptions[AddressType.IPv6],
					})
				: undefined,
			[AddressType.IPv4]: defaultOptions[AddressType.IPv4]
				? new Layer({
						...defaultOptions,
						...defaultOptions[AddressType.IPv4],
					})
				: undefined,
		};
	}

	/**
	 * Closes the DICE stack and all underlying network connections.
	 *
	 * Gracefully shuts down both IPv4 and IPv6 layers, stops healthcheck timers,
	 * and emits the 'close' event when complete.
	 */
	close = closeClient.bind(this, this);

	/**
	 * Opens the DICE stack and establishes network connectivity.
	 *
	 * This method performs several critical operations:
	 * 1. Initializes IPv4/IPv6 layers based on provided sockets
	 * 2. Discovers external IP addresses through peer reflection
	 * 3. Bootstraps coordinator lists from the network (if enabled)
	 * 4. Starts health check intervals to maintain peer pools
	 * 5. Emits 'open' event when ready
	 *
	 * After calling this method, the stack will automatically:
	 * - Maintain pools of coordinator peers for NAT traversal
	 * - Keep external address information up-to-date
	 * - Handle incoming messages and connectivity requests
	 *
	 * @param isBootstrapping - Whether to discover coordinators from bootstrap nodes (default: true).
	 *                          Set to false when running your own bootstrap node.
	 * @returns Promise that resolves when the stack is fully operational and ready to send/receive
	 *
	 * @example
	 * ```typescript
	 * await stack.open();
	 * console.log('Stack ready at:', stack.diceAddress.toString());
	 *
	 * // Listen for address updates
	 * stack.events.on('diceAddress', (address) => {
	 *   console.log('Address updated:', address.toString());
	 * });
	 * ```
	 */
	open = openClient.bind(this, this);

	/**
	 * Requests NAT traversal coordination for a target endpoint.
	 *
	 * Used internally when sending to peers behind NATs. Coordinates with
	 * the target's coordinator peers to establish direct connectivity.
	 *
	 * @param diceAddress - Target DICE address with coordinator information
	 * @param addressType - Optional: force IPv4 or IPv6
	 * @returns Promise that resolves when coordination is complete
	 * @throws {DiceError} When unable to request bind (no coordinators or layers)
	 */
	requestBind = requestClientBind.bind(this, this);

	/**
	 * Sends a message to another peer via their DICE address.
	 *
	 * This is the primary method for peer-to-peer communication. It handles:
	 * - Automatic NAT traversal using coordinators from the target address
	 * - Dual-stack connectivity (prefers IPv6, falls back to IPv4)
	 * - Connection establishment for first-time peers
	 * - Direct UDP delivery once connectivity is established
	 *
	 * The method will coordinate with the target's embedded coordinator peers
	 * to establish direct connectivity if needed. Once a direct connection exists,
	 * messages are sent via UDP without coordination overhead.
	 *
	 * @param diceAddress - Target peer's DICE address (obtained from them out-of-band)
	 * @param buffer - Message payload as Uint8Array (use TextEncoder for strings)
	 * @param addressType - Optional: force specific stack (AddressType.IPv4 or IPv6)
	 * @param options - Optional configuration
	 * @param options.timeoutMs - Timeout for send operation in milliseconds
	 * @param options.retryCount - Number of retry attempts on failure
	 * @returns Promise that resolves when message is successfully sent
	 * @throws {DiceError} When send fails after retries or no valid layers available
	 *
	 * @example
	 * ```typescript
	 * // Send a text message
	 * const message = new TextEncoder().encode('Hello, peer!');
	 * await stack.send(targetAddress, message);
	 *
	 * // Send binary data
	 * const data = new Uint8Array([1, 2, 3, 4]);
	 * await stack.send(targetAddress, data);
	 *
	 * // Force IPv4 with custom timeout
	 * await stack.send(targetAddress, message, AddressType.IPv4, {
	 *   timeoutMs: 5000,
	 *   retryCount: 3
	 * });
	 * ```
	 */
	send = sendClient.bind(this, this);

	clientListeners = {
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	overlayListeners = {
		addressListener: () => {
			this.events.emit("diceAddress", this.diceAddress);
		},
	};

	// Socket listeners removed - layer events are aggregated in stack.open()

	/**
	 * The current DICE address of this stack.
	 *
	 * This address is a self-contained connectivity descriptor that includes:
	 * - External IPv4/IPv6 addresses and ports
	 * - Coordinator peer addresses for NAT traversal coordination
	 * - All information needed for other peers to contact you
	 *
	 * The address format is: `dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]`
	 *
	 * Share this address with other peers (via your application's signaling mechanism)
	 * to enable them to send messages to you. The address updates automatically when:
	 * - External IP addresses are discovered or change
	 * - Coordinator lists are updated
	 * - Network conditions change
	 *
	 * Listen to the 'diceAddress' event to be notified of updates.
	 *
	 * @returns Your current DICE address
	 *
	 * @example
	 * ```typescript
	 * await stack.open();
	 *
	 * // Get the address
	 * const myAddress = stack.diceAddress;
	 * console.log('Share this:', myAddress.toString());
	 *
	 * // Listen for updates
	 * stack.events.on('diceAddress', (updatedAddress) => {
	 *   console.log('Address changed:', updatedAddress.toString());
	 *   // Share the new address with peers
	 * });
	 * ```
	 */
	get diceAddress(): DiceAddress {
		const ipv6Overlay = this.layers[AddressType.IPv6];
		const ipv4Overlay = this.layers[AddressType.IPv4];

		return new DiceAddress({
			[AddressType.IPv6]:
				ipv6Overlay?.external instanceof Ipv6Address
					? {
							address: ipv6Overlay.external,
							coordinators: !ipv6Overlay.isReachable ? (ipv6Overlay.coordinators.getAll() as Array<Ipv6Address>) : undefined,
						}
					: undefined,
			[AddressType.IPv4]:
				ipv4Overlay?.external instanceof Ipv4Address
					? {
							address: ipv4Overlay.external,
							coordinators: !ipv4Overlay?.isReachable ? (ipv4Overlay.coordinators.getAll() as Array<Ipv4Address>) : undefined,
						}
					: undefined,
		});
	}
}
