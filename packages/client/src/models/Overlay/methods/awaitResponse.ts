import { hex } from "@scure/base";
import { Overlay } from "..";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export interface AwaitOverlayResponseOptions {
	sendAbortController?: AbortController;
	signal?: AbortSignal;
	timeoutMs?: number;
}

export interface ResponseBodyAssertions<T extends MessageBodyType> {
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

export const awaitOverlayResponse = async <T extends MessageBodyType = MessageBodyType>(
	overlay: Overlay,
	assertions: ResponseBodyAssertions<T>,
	options?: AwaitOverlayResponseOptions
): Promise<Message<T>> => {
	return new Promise<Message<T>>(async (resolve, reject) => {
		if (options?.signal?.aborted) return reject(new DiceError("Awaiting response aborted"));

		const internalAbort = new AbortController();
		const key = assertions.source.address.key + assertions.body.type + hex.encode(assertions.body.transactionId);

		let abortListener: (() => void) | undefined;
		let responseListener: ((message: Message, context: Overlay.Context) => void) | undefined;
		let timeout: NodeJS.Timeout | undefined;

		const clearListeners = () => {
			if (options?.sendAbortController) options.sendAbortController.abort();
			if (abortListener) {
				options?.signal?.removeEventListener("abort", abortListener);
				internalAbort.signal.removeEventListener("abort", abortListener);
			}
			if (responseListener) overlay.responseListenerMap.delete(key);
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

		overlay.responseListenerMap.set(key, {
			abort: internalAbort,
			listener: responseListener,
		});

		timeout = setTimeout(() => {
			clearListeners();

			reject(new DiceError("Awaiting response timed out"));
		}, options?.timeoutMs || 3_000);
	});
};
