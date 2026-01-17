import type { RemoteInfo, Socket as UdpSocket } from "dgram";
import EventEmitter from "events";
import ipaddr from "ipaddr.js";
import { compare } from "uint8array-tools";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { redundantlyTry } from "../../utilities/redundantlyTry";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { Envelope } from "../Envelope";
import { EnvelopeCodec, EnvelopeVersion } from "../Envelope/Codec";
import { DiceError } from "../Error";
import type { EventEmitterOptions } from "../EventEmitter";
import type { Message } from "../Message";
import { MessageCodec, MessageVersion } from "../Message/Codec";

export namespace UdpTransport {
	export interface EventMap {
		send: [buffer: Uint8Array, address: Address];
		buffer: [buffer: Uint8Array, remoteInfo: RemoteInfo];
		envelope: [envelope: Envelope, context: UdpTransport.Context];
		message: [buffer: Uint8Array, context: UdpTransport.PayloadContext];
		diceMessage: [message: Message, context: UdpTransport.PayloadContext];
		error: [error: unknown];
		open: [];
		close: [];
	}

	export interface Options extends EventEmitterOptions {
		filter?: (buffer: Uint8Array, remoteAddress: Address) => boolean;
		socket: UdpTransport.Socket;
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

	export interface SendOptions {
		retryCount?: number;
		signal?: AbortSignal;
	}
}

/**
 * UDP socket adapter for DICE protocol transport.
 *
 * Handles low-level UDP send/receive with Envelope wrapping/parsing.
 * Emits events for each stage: buffer → envelope → message/diceMessage.
 *
 * @example
 * ```typescript
 * const udpTransport = new UdpTransport({ socket, local });
 * await udpTransport.open();
 *
 * udpTransport.events.on("message", (payload, context) => {
 *   console.log("Received application data");
 * });
 *
 * await udpTransport.send(payload, targetAddress);
 * ```
 */
export class UdpTransport {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_RETRY_COUNT = 3;

	public events: EventEmitter<UdpTransport.EventMap>;
	public local: Address;
	public options: UdpTransport.Options;
	public socket: UdpTransport.Socket;
	public state: UdpTransport.State = UdpTransport.STATE.CLOSED;

	constructor(options: RequiredProperties<UdpTransport.Options, "socket">) {
		this.options = {
			retryCount: UdpTransport.DEFAULT_RETRY_COUNT,
			...options,
		};

		this.events = new EventEmitter(options);
		this.local = Address.fromAddressInfo(options.socket.address());
		this.socket = options.socket;

		this.socket.on("message", this.socketListeners.messageListener);
		this.state = UdpTransport.STATE.OPENED;
		this.events.emit("open");
	}

	/**
	 * Closes the adapter and removes socket listeners.
	 */
	close(): void {
		if (this.state === UdpTransport.STATE.CLOSED) return;

		this.socket.removeListener("message", this.socketListeners.messageListener);
		this.state = UdpTransport.STATE.CLOSED;
		this.events.emit("close");
	}

	/**
	 * Sends payload to address, wrapped in Envelope with reflection.
	 * Always includes target address as reflectionAddress.
	 */
	async send(payload: Uint8Array, address: Address, options?: UdpTransport.SendOptions): Promise<void> {
		if (this.state !== UdpTransport.STATE.OPENED) {
			throw new DiceError("Cannot send: udpTransport is not opened");
		}

		const envelope = new Envelope({
			payload,
			reflectionAddress: address,
		});

		const buffer = envelope.buffer;

		this.events.emit("send", buffer, address);

		await redundantlyTry(
			async () => {
				if (this.state !== UdpTransport.STATE.OPENED) {
					throw new DiceError("Cannot send: adapter is not opened");
				}

				await new Promise<void>((resolve, reject) => {
					this.socket.send(buffer, address.port, ipaddr.fromByteArray([...address.ip.values()]).toString(), (error) => {
						if (error) {
							reject(error);
							return;
						}
						resolve();
					});
				});
			},
			{
				retryCount: options?.retryCount ?? this.options.retryCount ?? 3,
				delayMs: 100,
				signal: options?.signal,
				shouldRetry: (error: unknown) => {
					// Don't retry if adapter is closed
					if (error instanceof DiceError && error.message.includes("not opened")) {
						return false;
					}

					// Don't retry on abort
					if (error instanceof Error && (error.message === "Aborted" || error.name === "AbortError")) {
						return false;
					}

					// Retry network errors (socket not running)
					if (error instanceof Error && "code" in error && error.code === "ERR_SOCKET_DGRAM_NOT_RUNNING") {
						return true;
					}

					// Emit and retry other errors
					this.events.emit("error", error);
					return true;
				},
			}
		);
	}

	/**
	 * Handles incoming UDP buffer.
	 * Checks magic bytes, parses Envelope, emits events.
	 */
	handleBuffer(buffer: Uint8Array, context: RequiredProperties<UdpTransport.Context, "remoteInfo">): void {
		try {
			if (this.state !== UdpTransport.STATE.OPENED) return;

			this.events.emit("buffer", buffer, context.remoteInfo);

			if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

			const version = buffer.at(MAGIC_BYTES.byteLength);
			if (version === undefined || version > (EnvelopeVersion.V1 as number)) return;

			const remoteAddress = Address.fromAddressInfo(context.remoteInfo);
			if (remoteAddress.type !== this.local.type) return;

			if (this.options.filter && !this.options.filter(buffer, remoteAddress)) return;

			const envelope = EnvelopeCodec.decode(buffer);

			const nextContext: UdpTransport.Context = {
				buffer,
				remoteInfo: context.remoteInfo,
				remoteAddress,
			};

			this.events.emit("envelope", envelope, nextContext);

			this.handleEnvelope(envelope, nextContext);
		} catch (error) {
			this.events.emit("error", error);
		}
	}

	/**
	 * Handles parsed Envelope.
	 * Checks payload magic bytes to route to message or diceMessage.
	 */
	handleEnvelope(envelope: Envelope, context: RequiredProperties<UdpTransport.Context, "buffer" | "remoteInfo" | "remoteAddress">): void {
		try {
			if (this.state !== UdpTransport.STATE.OPENED) return;

			const isDiceMessage = compare(envelope.payload.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) === 0;

			if (isDiceMessage) {
				const version = envelope.payload.at(MAGIC_BYTES.byteLength);
				if (version === undefined || version > (MessageVersion.V0 as number)) return;

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
