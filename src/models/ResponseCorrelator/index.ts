import { hex } from "@scure/base";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Adapter } from "../Adapter";
import { DiceError } from "../Error";
import { Message } from "../Message";
import { MessageBodyType } from "../Message/BodyCodec";

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

export namespace ResponseCorrelator {
	export interface Options {
		adapter: Adapter;
		timeoutMs: number;
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
 * const correlator = new ResponseCorrelator();
 *
 * // Send request and await response
 * const promise = correlator.awaitResponse(assertions, options);
 * // ... send message ...
 *
 * // When response arrives
 * correlator.handleIncomingResponse(message, context);
 * ```
 */
export class ResponseCorrelator {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	static readonly DEFAULT_TIMEOUT_MS = 3_000;

	public adapter: Adapter;
	public options: ResponseCorrelator.Options;
	public listeners = new Map<string, { abort: AbortController; listener: (message: Message) => void; timeout: NodeJS.Timeout }>();
	public state: Adapter.State = Adapter.STATE.CLOSED;

	constructor(options: RequiredProperties<ResponseCorrelator.Options, "adapter">) {
		this.options = {
			timeoutMs: ResponseCorrelator.DEFAULT_TIMEOUT_MS,
			...options,
		};

		this.adapter = options.adapter;

		this.adapter.events.on("diceMessage", this.adapterListeners.diceMessageListener);
		this.state = Adapter.STATE.OPENED;
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
			if (options?.signal?.aborted) return reject(new DiceError("Awaiting response aborted"));

			const internalAbort = new AbortController();
			const key = `${assertions.source.address.key}:${assertions.body.type}:${hex.encode(assertions.body.transactionId)}`;

			let abortListener: (() => void) | undefined;
			let responseListener: ((message: Message) => void) | undefined;
			let timeout: NodeJS.Timeout | undefined;

			const clearListeners = () => {
				if (options?.sendAbortController) options.sendAbortController.abort();
				if (abortListener) {
					options?.signal?.removeEventListener("abort", abortListener);
					internalAbort.signal.removeEventListener("abort", abortListener);
				}
				if (responseListener) this.listeners.delete(key);
				if (timeout) clearTimeout(timeout);
			};

			abortListener = () => {
				clearListeners();
				reject(new DiceError("Awaiting response aborted"));
			};

			options?.signal?.addEventListener("abort", abortListener);
			internalAbort.signal.addEventListener("abort", abortListener);

			responseListener = (response: Message) => {
				clearListeners();
				resolve(response as Message<T>);
			};

			timeout = setTimeout(() => {
				clearListeners();
				reject(new DiceError("Awaiting response timed out"));
			}, options?.timeoutMs || this.options.timeoutMs);

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
	 * Used during layer close to clean up pending requests.
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
	 * Closes the correlator and removes adapter listener.
	 */
	close(): void {
		if (this.state === Adapter.STATE.CLOSED) return;

		this.adapter.events.removeListener("diceMessage", this.adapterListeners.diceMessageListener);
		this.state = Adapter.STATE.CLOSED;
	}

	/**
	 * Gets the number of pending requests.
	 *
	 * @returns Number of requests awaiting responses
	 */
	get pendingCount(): number {
		return this.listeners.size;
	}

	adapterListeners = {
		diceMessageListener: (message: Message, context: Adapter.PayloadContext) => {
			if (!("transactionId" in message.body)) return;

			const key = `${context.remoteAddress.key}:${message.body.type}:${hex.encode(message.body.transactionId)}`;
			const listener = this.listeners.get(key);

			if (listener) listener.listener(message);
		},
	};
}
