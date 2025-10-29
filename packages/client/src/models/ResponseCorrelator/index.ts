import { hex } from "@scure/base";
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
	public listeners = new Map<string, { abort: AbortController; listener: (message: Message) => void }>();

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
			const key = assertions.source.address.key + assertions.body.type + hex.encode(assertions.body.transactionId);

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

			this.listeners.set(key, {
				abort: internalAbort,
				listener: responseListener,
			});

			timeout = setTimeout(() => {
				clearListeners();
				reject(new DiceError("Awaiting response timed out"));
			}, options?.timeoutMs || 3_000);
		});
	}

	/**
	 * Handles an incoming response message.
	 *
	 * Checks if there's a pending request matching this response and resolves it.
	 *
	 * @param message - The incoming message
	 * @param context - Message context with source address
	 * @returns true if a matching listener was found and invoked
	 */
	handleIncomingResponse(message: Message, context: { remoteAddress: { key: string } }): boolean {
		if (!("transactionId" in message.body)) return false;

		const key = context.remoteAddress.key + message.body.type + hex.encode(message.body.transactionId);
		const listener = this.listeners.get(key);

		if (listener) {
			listener.listener(message);

			return true;
		}

		return false;
	}

	/**
	 * Aborts all pending requests.
	 *
	 * Used during layer close to clean up pending requests.
	 */
	abortAll(): void {
		for (const { abort } of this.listeners.values()) {
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
			listener.abort.abort();
			this.listeners.delete(key);
		}
	}

	/**
	 * Gets the number of pending requests.
	 *
	 * @returns Number of requests awaiting responses
	 */
	get pendingCount(): number {
		return this.listeners.size;
	}
}
