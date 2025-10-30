import { RemoteInfo, Socket as UdpSocket } from "dgram";
import EventEmitter from "events";
import ipaddr from "ipaddr.js";
import { compare } from "uint8array-tools";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { redundantlyTry } from "../../utilities/redundantlyTry";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { Envelope } from "../Envelope";
import { VERSION as ENVELOPE_VERSION, EnvelopeCodec } from "../Envelope/Codec";
import { DiceError } from "../Error";
import { EventEmitterOptions } from "../EventEmitter";
import { Message } from "../Message";
import { VERSION as MESSAGE_VERSION, MessageCodec } from "../Message/Codec";

export namespace Adapter {
	export interface EventMap {
		send: [buffer: Uint8Array, address: Address];
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		envelope: [envelope: Envelope, context: Adapter.Context];
		message: [buffer: Uint8Array, context: Adapter.PayloadContext];
		diceMessage: [message: Message, context: Adapter.PayloadContext];
		error: [error: unknown];
		open: [];
		close: [];
	}

	export interface Options extends EventEmitterOptions {
		filter?: (buffer: Uint8Array, remoteAddress: Address) => boolean;
		socket: Adapter.Socket;
		retryCount?: number;
	}

	export interface Context {
		buffer: Uint8Array;
		remoteInfo: RemoteInfo;
		remoteAddress: Address;
	}

	export interface PayloadContext extends Context {
		envelope: Envelope;
	}

	export type Socket = Pick<UdpSocket, "address" | "close" | "on" | "removeListener" | "send" | "unref">;

	export type State = 0 | 1;
}

export interface SendOptions {
	retryCount?: number;
	signal?: AbortSignal;
}

/**
 * UDP socket adapter for DICE protocol transport.
 *
 * Handles low-level UDP send/receive with Envelope wrapping/parsing.
 * Emits events for each stage: buffer → envelope → message/diceMessage.
 *
 * @example
 * ```typescript
 * const adapter = new Adapter({ socket, local });
 * await adapter.open();
 *
 * adapter.events.on("message", (payload, context) => {
 *   console.log("Received application data");
 * });
 *
 * await adapter.send(payload, targetAddress);
 * ```
 */
export class Adapter {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_RETRY_COUNT = 3;

	public events: EventEmitter<Adapter.EventMap>;
	public local: Address;
	public options: Adapter.Options;
	public socket: Adapter.Socket;
	public state: Adapter.State = Adapter.STATE.CLOSED;

	constructor(options: RequiredProperties<Adapter.Options, "socket">) {
		this.options = {
			retryCount: Adapter.DEFAULT_RETRY_COUNT,
			...options,
		};

		this.events = new EventEmitter(options);
		this.local = Address.fromAddressInfo(options.socket.address());
		this.socket = options.socket;

		this.socket.on("message", this.socketListeners.messageListener);
		this.state = Adapter.STATE.OPENED;
		this.events.emit("open");
	}

	/**
	 * Closes the adapter and removes socket listeners.
	 */
	close(): void {
		if (this.state === Adapter.STATE.CLOSED) return;

		this.socket.removeListener("message", this.socketListeners.messageListener);
		this.state = Adapter.STATE.CLOSED;
		this.events.emit("close");
	}

	/**
	 * Sends payload to address, wrapped in Envelope with reflection.
	 * Always includes target address as reflectionAddress.
	 */
	async send(payload: Uint8Array, address: Address, options?: SendOptions): Promise<void> {
		if (this.state !== Adapter.STATE.OPENED) {
			throw new DiceError("Cannot send: adapter is not opened");
		}

		const envelope = new Envelope({
			payload,
			reflectionAddress: address,
		});

		const buffer = envelope.buffer;

		this.events.emit("send", buffer, address);

		await redundantlyTry(
			async () => {
				if (this.state !== Adapter.STATE.OPENED) {
					throw new DiceError("Cannot send: adapter is not opened");
				}

				await new Promise<void>((resolve, reject) => {
					this.socket.send(buffer, address.port, ipaddr.fromByteArray([...address.ip.values()]).toString(), (error) => {
						if (error) return reject(error);
						resolve();
					});
				});
			},
			{
				retryCount: options?.retryCount ?? this.options.retryCount ?? 3,
				delayMs: 100,
				signal: options?.signal,
				shouldRetry: (error: any) => {
					// Emit error event unless it's a socket not running error
					if (error?.code !== "ERR_SOCKET_DGRAM_NOT_RUNNING") {
						this.events.emit("error", error);
					}
					// Always retry
					return true;
				},
			}
		);
	}

	/**
	 * Handles incoming UDP buffer.
	 * Checks magic bytes, parses Envelope, emits events.
	 */
	async handleBuffer(buffer: Uint8Array, context: RequiredProperties<Adapter.Context, "remoteInfo">): Promise<void> {
		try {
			if (this.state !== Adapter.STATE.OPENED) return;

			this.events.emit("buffer", buffer, context.remoteInfo);

			if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

			const version = buffer.at(MAGIC_BYTES.byteLength);
			if (version === undefined || version > ENVELOPE_VERSION.V1) return;

			const remoteAddress = Address.fromAddressInfo(context.remoteInfo);
			if (remoteAddress.type !== this.local.type) return;

			if (this.options.filter && !this.options.filter(buffer, remoteAddress)) return;

			const envelope = EnvelopeCodec.decode(buffer);

			const nextContext: Adapter.Context = {
				buffer,
				remoteInfo: context.remoteInfo,
				remoteAddress,
			};

			this.events.emit("envelope", envelope, nextContext);

			await this.handleEnvelope(envelope, nextContext);
		} catch (error) {
			this.events.emit("error", error);
		}
	}

	/**
	 * Handles parsed Envelope.
	 * Checks payload magic bytes to route to message or diceMessage.
	 */
	async handleEnvelope(envelope: Envelope, context: RequiredProperties<Adapter.Context, "buffer" | "remoteInfo" | "remoteAddress">): Promise<void> {
		try {
			if (this.state !== Adapter.STATE.OPENED) return;

			const isDiceMessage = compare(envelope.payload.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) === 0;

			if (isDiceMessage) {
				const version = envelope.payload.at(MAGIC_BYTES.byteLength);
				if (version === undefined || version > MESSAGE_VERSION.V0) return;

				const message = MessageCodec.decode(envelope.payload);

				this.events.emit("diceMessage", message, { ...context, envelope });
			} else {
				this.events.emit("message", envelope.payload, { ...context, envelope });
			}
		} catch (error) {
			this.events.emit("error", error);
		}
	}


	private socketListeners = {
		messageListener: (buffer: Uint8Array, remoteInfo: RemoteInfo) => {
			this.handleBuffer(buffer, { remoteInfo });
		},
	};
}
