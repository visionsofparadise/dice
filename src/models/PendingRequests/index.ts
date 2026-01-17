import { hex } from "@scure/base";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import { DiceError } from "../Error";
import type { Message } from "../Message";
import type { MessageBodyType } from "../Message/BodyCodec";
import { UdpTransport } from "../UdpTransport";

export interface AwaitResponseOptions {
	sendAbortController?: AbortController;
	signal?: AbortSignal;
	timeoutMs?: number;
}

export interface ResponseAssertions<T extends MessageBodyType> {
	source: {
		address: {
			key: string;
		};
	};
	body: {
		type: T;
		transactionId: Uint8Array;
	};
}

export namespace PendingRequests {
	export interface Options {
		timeoutMs: number;
		udpTransport: UdpTransport;
	}

	export type State = 0 | 1;
}

/**
 * Manages request/response correlation for protocol messages.
 *
 * Tracks pending requests and resolves them when matching responses arrive.
 * Handles timeouts, abort signals, and cleanup.
 *
 * @example
 * ```typescript
 * const pendingRequests = new PendingRequests();
 *
 * // Send request and await response
 * const promise = pendingRequests.awaitResponse(assertions, options);
 * // ... send message ...
 *
 * // When response arrives
 * pendingRequests.handleIncomingResponse(message, context);
 * ```
 */
export class PendingRequests {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_TIMEOUT_MS = 3_000;

	public options: PendingRequests.Options;
	public listeners = new Map<string, { abort: AbortController; listener: (message: Message) => void; timeout: NodeJS.Timeout }>();
	public state: UdpTransport.State = UdpTransport.STATE.CLOSED;
	public udpTransport: UdpTransport;

	constructor(options: RequiredProperties<PendingRequests.Options, "udpTransport">) {
		this.options = {
			timeoutMs: PendingRequests.DEFAULT_TIMEOUT_MS,
			...options,
		};

		this.udpTransport = options.udpTransport;

		this.udpTransport.events.on("diceMessage", this.udpTransportListeners.diceMessageListener);
		this.state = UdpTransport.STATE.OPENED;
	}

	/**
	 * Waits for a response message matching the given assertions.
	 *
	 * @param assertions - Criteria for matching the response
	 * @param options - Timeout, abort signal, and send abort controller
	 * @returns Promise resolving to the matching response message
	 * @throws {DiceError} When request times out or is aborted
	 */
	async awaitResponse<T extends MessageBodyType = MessageBodyType>(assertions: ResponseAssertions<T>, options?: AwaitResponseOptions): Promise<Message<T>> {
		return new Promise<Message<T>>((resolve, reject) => {
			if (options?.signal?.aborted) {
				reject(new DiceError("Awaiting response aborted"));
				return;
			}

			const internalAbort = new AbortController();
			const key = `${assertions.source.address.key}:${assertions.body.type}:${hex.encode(assertions.body.transactionId)}`;

			const abortListener = () => {
				cleanup();
				reject(new DiceError("Awaiting response aborted"));
			};

			const responseListener = (response: Message) => {
				cleanup();
				resolve(response as Message<T>);
			};

			const timeout = setTimeout(() => {
				cleanup();
				reject(new DiceError("Awaiting response timed out"));
			}, options?.timeoutMs ?? this.options.timeoutMs);

			const cleanup = () => {
				if (options?.sendAbortController) options.sendAbortController.abort();
				options?.signal?.removeEventListener("abort", abortListener);
				internalAbort.signal.removeEventListener("abort", abortListener);
				this.listeners.delete(key);
				clearTimeout(timeout);
			};

			options?.signal?.addEventListener("abort", abortListener);
			internalAbort.signal.addEventListener("abort", abortListener);

			this.listeners.set(key, {
				abort: internalAbort,
				listener: responseListener,
				timeout,
			});
		});
	}

	/**
	 * Aborts all pending requests.
	 *
	 * Used during ipChannel close to clean up pending requests.
	 */
	abortAll(): void {
		for (const { abort, timeout } of this.listeners.values()) {
			clearTimeout(timeout);
			abort.abort();
		}
		this.listeners.clear();
	}

	/**
	 * Aborts a specific pending request by key.
	 *
	 * @param key - The request key to abort
	 */
	abortRequest(key: string): void {
		const listener = this.listeners.get(key);
		if (listener) {
			clearTimeout(listener.timeout);
			listener.abort.abort();
			this.listeners.delete(key);
		}
	}

	/**
	 * Closes the correlator and removes udpTransport listener.
	 */
	close(): void {
		if (this.state === UdpTransport.STATE.CLOSED) return;

		this.udpTransport.events.removeListener("diceMessage", this.udpTransportListeners.diceMessageListener);
		this.state = UdpTransport.STATE.CLOSED;
	}

	/**
	 * Gets the number of pending requests.
	 *
	 * @returns Number of requests awaiting responses
	 */
	get pendingCount(): number {
		return this.listeners.size;
	}

	udpTransportListeners = {
		diceMessageListener: (message: Message, context: UdpTransport.PayloadContext) => {
			if (!("transactionId" in message.body)) return;

			const key = `${context.remoteAddress.key}:${message.body.type}:${hex.encode(message.body.transactionId)}`;
			const listener = this.listeners.get(key);

			if (listener) listener.listener(message);
		},
	};
}
