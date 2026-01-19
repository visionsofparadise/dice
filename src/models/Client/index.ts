import type { RemoteInfo } from "dgram";
import EventEmitter from "events";
import { type Logger, wrapLogger } from "../../utilities/Logger";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import { AddressType } from "../Address/Type";
import { BindingCache } from "../BindingCache";
import { DiceAddress } from "../DiceAddress";
import type { Envelope } from "../Envelope";
import { DiceError } from "../Error";
import type { EventEmitterOptions } from "../EventEmitter";
import { IpChannel } from "../IpChannel";
import type { Message } from "../Message";
import type { UdpTransport } from "../UdpTransport";

export namespace Client {
	export interface EventMap {
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		close: [];
		depleted: [];
		diceAddress: [diceAddress: DiceAddress];
		envelope: [envelope: Envelope, context: IpChannel.Context];
		error: [error: unknown];
		message: [buffer: Uint8Array, context: IpChannel.Context];
		diceMessage: [message: Message, context: IpChannel.Context];
		open: [];
		reachable: [isReachable: boolean, addressType: AddressType];
	}

	export interface Options extends UdpTransport.SendOptions, EventEmitterOptions {
		[AddressType.IPv6]?: RequiredProperties<IpChannel.Options, "socket">;
		[AddressType.IPv4]?: RequiredProperties<IpChannel.Options, "socket">;
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
 * DICE Client for peer-to-peer networking without infrastructure dependencies.
 *
 * Manages dual-stack IPv4/IPv6 IpChannels and provides a high-level interface for:
 * - Generating your own DICE addresses
 * - Sending messages to others' DICE addresses
 * - Automatic NAT traversal and connectivity handling
 *
 * @example
 * ```typescript
 * const client = new Client({
 *   [AddressType.IPv4]: { socket: ipv4Socket },
 *   [AddressType.IPv6]: { socket: ipv6Socket }
 * });
 *
 * await client.open();
 * console.log("My address:", client.diceAddress.toString());
 *
 * client.on("diceaddress", (diceaddress) => {
 *   console.log(diceAddress.toString());
 * });
 *
 * await client.send(targetAddress, messageBuffer);
 * ```
 */
export class Client {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	/**
	 * Event emitter for client lifecycle and network events.
	 *
	 * Available events:
	 * - `open`: Emitted when client successfully opens and is ready to send/receive
	 * - `close`: Emitted when client closes and all connections are terminated
	 * - `diceAddress`: Emitted when the DICE address changes (external IP discovered, coordinators updated)
	 * - `message`: Emitted when receiving application-layer messages from other peers
	 * - `error`: Emitted when errors occur during network operations
	 *
	 * @example
	 * ```typescript
	 * client.events.on('open', () => {
	 *   console.log('Client is ready');
	 * });
	 *
	 * client.events.on('diceAddress', (diceAddress) => {
	 *   console.log('My address:', diceAddress.toString());
	 * });
	 *
	 * client.events.on('message', (message, remoteInfo) => {
	 *   console.log('Received:', message);
	 * });
	 * ```
	 */
	public events: EventEmitter<Client.EventMap>;
	public ipChannels: {
		[AddressType.IPv6]?: IpChannel;
		[AddressType.IPv4]?: IpChannel;
	};
	public logger?: Logger;
	public options: Client.Options;
	public state: Client.State = Client.STATE.CLOSED;

	/**
	 * Creates a new DICE client for P2P networking.
	 *
	 * The client manages dual-stack IPv4/IPv6 IpChannels for maximum connectivity.
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
	 * import { Client } from '@xkore/dice';
	 * import { AddressType } from '@xkore/dice/models/Address';
	 *
	 * // Dual-stack client (recommended)
	 * const client = new Client({
	 *   [AddressType.IPv4]: { socket: createSocket('udp4') },
	 *   [AddressType.IPv6]: { socket: createSocket('udp6') }
	 * });
	 *
	 * // Single-stack IPv4 only
	 * const ipv4Client = new Client({
	 *   [AddressType.IPv4]: { socket: createSocket('udp4') }
	 * });
	 * ```
	 */
	constructor(options?: Partial<Client.Options>) {
		const defaultOptions = {
			cacheSize: BindingCache.DEFAULT_CACHE_SIZE,
			concurrency: IpChannel.DEFAULT_CONCURRENCY,
			depth: IpChannel.DEFAULT_DEPTH,
			healthcheckIntervalMs: IpChannel.DEFAULT_HEALTHCHECK_INTERVAL_MS,
			...options,
		};

		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, "DICE");
		this.options = defaultOptions;
		this.ipChannels = {
			[AddressType.IPv6]: defaultOptions[AddressType.IPv6]
				? new IpChannel({
						...defaultOptions,
						...defaultOptions[AddressType.IPv6],
					})
				: undefined,
			[AddressType.IPv4]: defaultOptions[AddressType.IPv4]
				? new IpChannel({
						...defaultOptions,
						...defaultOptions[AddressType.IPv4],
					})
				: undefined,
		};
	}

	/**
	 * Closes the DICE client and all underlying network connections.
	 *
	 * Gracefully shuts down both IPv4 and IPv6 IpChannels, stops healthcheck timers,
	 * and emits the 'close' event when complete.
	 */
	close(): void {
		if (this.state === Client.STATE.CLOSED) return;

		this.logger?.info("Closing");

		this.events.removeListener("error", this.clientListeners.errorListener);

		for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
			this.ipChannels[addressType]?.events.removeListener("address", this.ipChannelListeners.addressListener);
			this.ipChannels[addressType]?.close();
		}

		this.state = Client.STATE.CLOSED;
		this.events.emit("close");
		this.logger?.info("Closed");
	}

	/**
	 * Opens the DICE client and establishes network connectivity.
	 *
	 * This method performs several critical operations:
	 * 1. Initializes IPv4/IPv6 IpChannels based on provided sockets
	 * 2. Discovers external IP addresses through peer reflection
	 * 3. Bootstraps coordinator lists from the network (if enabled)
	 * 4. Starts health check intervals to maintain peer pools
	 * 5. Emits 'open' event when ready
	 *
	 * After calling this method, the client will automatically:
	 * - Maintain pools of coordinator peers for NAT traversal
	 * - Keep external address information up-to-date
	 * - Handle incoming messages and connectivity requests
	 *
	 * @param isBootstrapping - Whether to discover coordinators from bootstrap nodes (default: true).
	 *                          Set to false when running your own bootstrap node.
	 * @returns Promise that resolves when the client is fully operational and ready to send/receive
	 *
	 * @example
	 * ```typescript
	 * await client.open();
	 * console.log('Client ready at:', client.diceAddress.toString());
	 *
	 * // Listen for address updates
	 * client.events.on('diceAddress', (address) => {
	 *   console.log('Address updated:', address.toString());
	 * });
	 * ```
	 */
	open(): void {
		if (this.state === Client.STATE.OPENED) {
			this.logger?.debug("Client already opened");
			return;
		}

		this.logger?.info("Opening");

		this.events.on("error", this.clientListeners.errorListener);

		for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
			const ipChannel = this.ipChannels[addressType];
			// Note: IpChannels auto-open on construction, no need to call ipChannel.open()

			if (!ipChannel) continue;

			ipChannel.events.on("address", this.ipChannelListeners.addressListener);
			ipChannel.events.on("reachable", (isReachable) => this.events.emit("reachable", isReachable, addressType));
			ipChannel.udpTransport.events.on("buffer", (buffer, remoteInfo) => this.events.emit("buffer", buffer, remoteInfo));
			ipChannel.udpTransport.events.on("envelope", (envelope, context) => this.events.emit("envelope", envelope, context));
			ipChannel.udpTransport.events.on("message", (buffer, context) => this.events.emit("message", buffer, context));
			ipChannel.udpTransport.events.on("diceMessage", (message, context) => this.events.emit("diceMessage", message, context));
			ipChannel.coordinators.events.on("depleted", () => this.events.emit("depleted"));
		}

		this.state = Client.STATE.OPENED;
		this.events.emit("open");
		this.logger?.info("Open");
	}

	/**
	 * Requests NAT traversal coordination for a target endpoint.
	 *
	 * Used internally when sending to peers behind NATs. Coordinates with
	 * the target's coordinator peers to establish direct connectivity.
	 *
	 * @param diceAddress - Target DICE address with coordinator information
	 * @param addressType - Optional: force IPv4 or IPv6
	 * @returns Promise that resolves when coordination is complete
	 * @throws {DiceError} When unable to request bind (no coordinators or IpChannels)
	 */
	async requestBind(diceAddress: DiceAddress, addressType?: AddressType): Promise<void> {
		if (this.state !== Client.STATE.OPENED) {
			throw new DiceError("Cannot request bind: client is not opened");
		}

		// Validate at least one valid endpoint exists
		const hasIPv6 = diceAddress[AddressType.IPv6]?.address && this.ipChannels[AddressType.IPv6];
		const hasIPv4 = diceAddress[AddressType.IPv4]?.address && this.ipChannels[AddressType.IPv4];

		if (!hasIPv6 && !hasIPv4) {
			throw new DiceError(
				`Unable to request bind: no compatible IpChannels. ` +
					`DiceAddress: ${diceAddress.toString()}, ` +
					`Client IpChannels: ${this.ipChannels[AddressType.IPv6] ? "IPv6" : "no IPv6"}, ${this.ipChannels[AddressType.IPv4] ? "IPv4" : "no IPv4"}`,
			);
		}

		for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
			const endpoint = diceAddress[type];
			const ipChannel = this.ipChannels[type];

			if (!endpoint?.address || !endpoint.coordinators?.length || !ipChannel) continue;

			await ipChannel.protocol.requestBind(endpoint.address, endpoint.coordinators);

			return;
		}

		throw new DiceError("Unable to request bind");
	}

	/**
	 * Considers a DiceAddress for coordinator discovery.
	 *
	 * For each endpoint that claims to be publicly reachable (coordinators === undefined),
	 * pings the address and adds to the coordinator pool if responsive.
	 *
	 * @param diceAddress - DiceAddress to evaluate for coordinator candidates
	 */
	async handleDiceAddress(diceAddress: DiceAddress): Promise<void> {
		if (this.state !== Client.STATE.OPENED) {
			throw new DiceError("Cannot handle DiceAddress: client is not opened");
		}

		for (const type of [AddressType.IPv6, AddressType.IPv4] as const) {
			const endpoint = diceAddress[type];
			const ipChannel = this.ipChannels[type];

			if (endpoint?.address && endpoint.coordinators === undefined && ipChannel) {
				await ipChannel.handleAddress(endpoint.address);
			}
		}
	}

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
	 * @param addressType - Optional: force specific address family (AddressType.IPv4 or IPv6)
	 * @param options - Optional configuration
	 * @param options.timeoutMs - Timeout for send operation in milliseconds
	 * @param options.retryCount - Number of retry attempts on failure
	 * @returns Promise that resolves when message is successfully sent
	 * @throws {DiceError} When send fails after retries or no valid IpChannels available
	 *
	 * @example
	 * ```typescript
	 * // Send a text message
	 * const message = new TextEncoder().encode('Hello, peer!');
	 * await client.send(targetAddress, message);
	 *
	 * // Send binary data
	 * const data = new Uint8Array([1, 2, 3, 4]);
	 * await client.send(targetAddress, data);
	 *
	 * // Force IPv4 with custom timeout
	 * await client.send(targetAddress, message, AddressType.IPv4, {
	 *   timeoutMs: 5000,
	 *   retryCount: 3
	 * });
	 * ```
	 */
	async send(diceAddress: DiceAddress, buffer: Uint8Array, addressType?: AddressType, options?: UdpTransport.SendOptions): Promise<void> {
		if (this.state !== Client.STATE.OPENED) {
			throw new DiceError("Cannot send: client is not opened");
		}

		// Validate at least one valid endpoint exists
		const hasIPv6 = diceAddress[AddressType.IPv6]?.address && this.ipChannels[AddressType.IPv6];
		const hasIPv4 = diceAddress[AddressType.IPv4]?.address && this.ipChannels[AddressType.IPv4];

		if (!hasIPv6 && !hasIPv4) {
			throw new DiceError(
				`Unable to send: no compatible IpChannels. ` +
					`DiceAddress: ${diceAddress.toString()}, ` +
					`Client IpChannels: ${this.ipChannels[AddressType.IPv6] ? "IPv6" : "no IPv6"}, ${this.ipChannels[AddressType.IPv4] ? "IPv4" : "no IPv4"}`,
			);
		}

		await this.handleDiceAddress(diceAddress);

		for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
			const endpoint = diceAddress[type];
			const ipChannel = this.ipChannels[type];

			if (!endpoint?.address || !ipChannel) continue;

			if (endpoint.coordinators?.length) {
				await ipChannel.protocol.requestBind(endpoint.address, endpoint.coordinators);
			}

			await ipChannel.udpTransport.send(buffer, endpoint.address, options);

			return;
		}

		// If we get here, nothing was sent
		throw new DiceError(
			`Unable to send: no compatible IpChannels available. ` +
				`DiceAddress has ${diceAddress[AddressType.IPv6] ? "IPv6" : "no IPv6"}, ` +
				`${diceAddress[AddressType.IPv4] ? "IPv4" : "no IPv4"}. ` +
				`Client has ${this.ipChannels[AddressType.IPv6] ? "IPv6" : "no IPv6"}, ` +
				`${this.ipChannels[AddressType.IPv4] ? "IPv4" : "no IPv4"} IpChannel(s).`,
		);
	}

	clientListeners = {
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	ipChannelListeners = {
		addressListener: () => {
			this.events.emit("diceAddress", this.diceAddress);
		},
	};

	// Socket listeners removed - IpChannel events are aggregated in client.open()

	/**
	 * The current DICE address of this client.
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
	 * await client.open();
	 *
	 * // Get the address
	 * const myAddress = client.diceAddress;
	 * console.log('Share this:', myAddress.toString());
	 *
	 * // Listen for updates
	 * client.events.on('diceAddress', (updatedAddress) => {
	 *   console.log('Address changed:', updatedAddress.toString());
	 *   // Share the new address with peers
	 * });
	 * ```
	 */
	get diceAddress(): DiceAddress {
		return new DiceAddress({
			[AddressType.IPv6]: this.ipChannels[AddressType.IPv6]?.address as DiceAddress[AddressType.IPv6],
			[AddressType.IPv4]: this.ipChannels[AddressType.IPv4]?.address as DiceAddress[AddressType.IPv4],
		});
	}
}
