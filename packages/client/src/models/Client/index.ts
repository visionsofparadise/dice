import { defaults } from "@technically/lodash";
import { RemoteInfo } from "dgram";
import EventEmitter from "events";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { AddressType } from "../Address/Type";
import { DiceAddress } from "../DiceAddress";
import { EventEmitterOptions } from "../EventEmitter";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { Overlay } from "../Overlay";
import { SendOverlayOptions } from "../Overlay/methods/send";
import { closeClient } from "./methods/close";
import { openClient } from "./methods/open";
import { requestClientBind } from "./methods/requestBind";
import { sendClient } from "./methods/send";

export namespace Client {
	export interface EventMap {
		close: [];
		diceAddress: [diceAddress: DiceAddress];
		error: [error: unknown];
		message: [message: Uint8Array, remoteInfo: RemoteInfo];
		open: [];
	}

	export interface Options extends SendOverlayOptions, EventEmitterOptions {
		[AddressType.IPv6]?: RequiredProperties<Overlay.Options, "socket">;
		[AddressType.IPv4]?: RequiredProperties<Overlay.Options, "socket">;
		cacheSize: number;
		concurrency: number;
		depth: {
			minimum: number;
			maximum: number;
		};
		healthcheckIntervalMs: number;
		logger?: Logger;
		relayCount: number;
	}

	export type State = 0 | 1;
}

/**
 * DICE Client for peer-to-peer networking without infrastructure dependencies.
 *
 * Manages dual-stack IPv4/IPv6 overlays and provides a high-level interface for:
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

	public events: EventEmitter<Client.EventMap>;
	public logger?: Logger;
	public options: Client.Options;
	public overlays: {
		[AddressType.IPv6]?: Overlay;
		[AddressType.IPv4]?: Overlay;
	};
	public state: Client.State = Client.STATE.CLOSED;

	/**
	 * Creates a new DICE client.
	 *
	 * @param options - Configuration including sockets and networking parameters
	 */
	constructor(options?: Partial<Client.Options>) {
		const defaultOptions = defaults(options, {
			cacheSize: 10_000,
			concurrency: 3,
			depth: {
				minimum: 3,
				maximum: 10,
			},
			healthcheckIntervalMs: 60_000,
			relayCount: 9,
		});

		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, "DICE");
		this.options = defaultOptions;
		this.overlays = {
			[AddressType.IPv6]: defaultOptions[AddressType.IPv6]
				? new Overlay({
						...defaultOptions,
						...defaultOptions[AddressType.IPv6],
					})
				: undefined,
			[AddressType.IPv4]: defaultOptions[AddressType.IPv4]
				? new Overlay({
						...defaultOptions,
						...defaultOptions[AddressType.IPv4],
					})
				: undefined,
		};
	}

	/**
	 * Closes the DICE client and all underlying network connections.
	 *
	 * Gracefully shuts down both IPv4 and IPv6 overlays, stops healthcheck timers,
	 * and emits the 'close' event when complete.
	 */
	close = closeClient.bind(this, this);

	/**
	 * Opens the DICE client and begins peer discovery.
	 *
	 * Initializes both IPv4 and IPv6 overlays, begins healthcheck cycles,
	 * and starts discovering coordinators from bootstrap peers.
	 * Emits 'open' event when ready to send/receive messages.
	 *
	 * @param isBootstrapping - Whether to bootstrap (default: true)
	 * @returns Promise that resolves when client is fully operational
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
	 * @throws {DiceError} When unable to request bind (no coordinators or overlays)
	 */
	requestBind = requestClientBind.bind(this, this);

	/**
	 * Sends a message directly to another DICE address.
	 *
	 * Automatically handles NAT traversal if needed by coordinating with
	 * coordinator peers embedded in the target address. Prefers IPv6, falls back to IPv4.
	 *
	 * @param diceAddress - Target DICE address to send to
	 * @param buffer - Message data to send
	 * @param addressType - Optional: force IPv4 or IPv6
	 * @param options - Optional: timeout and retry configuration
	 * @returns Promise that resolves when message is sent
	 *
	 * @example
	 * ```typescript
	 * const message = new TextEncoder().encode("Hello, peer!");
	 *
	 * await client.send(targetAddress, message);
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

	overlaySocketListeners = {
		messageListener: (message: Uint8Array, remoteInfo: RemoteInfo) => {
			this.events.emit("message", message, remoteInfo);
		},
	};

	/**
	 * The current DICE address.
	 *
	 * The DICE address embeds connectivity information including external IP addresses
	 * and coordinator lists for NAT traversal. This address can be shared with other
	 * peers to enable direct messaging.
	 *
	 * Address format: `dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]`
	 *
	 * @returns DiceAddress
	 *
	 */
	get diceAddress(): DiceAddress {
		const ipv6Overlay = this.overlays[AddressType.IPv6];
		const ipv4Overlay = this.overlays[AddressType.IPv4];

		return new DiceAddress({
			[AddressType.IPv6]:
				ipv6Overlay?.external instanceof Ipv6Address
					? {
							address: ipv6Overlay.external,
							coordinators: !ipv6Overlay.isReachable ? (ipv6Overlay.coordinators as Array<Ipv6Address>) : undefined,
						}
					: undefined,
			[AddressType.IPv4]:
				ipv4Overlay?.external instanceof Ipv4Address
					? {
							address: ipv4Overlay.external,
							coordinators: !ipv6Overlay?.isReachable ? (ipv4Overlay.coordinators as Array<Ipv4Address>) : undefined,
						}
					: undefined,
		});
	}
}
