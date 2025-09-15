import { Client } from "..";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export interface AwaitClientResponseOptions {
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
	};
}

export const awaitClientResponse = async <T extends MessageBodyType = MessageBodyType>(
	client: Client,
	assertions: ResponseBodyAssertions<T>,
	options?: AwaitClientResponseOptions
): Promise<Message<T>> => {
	return new Promise<Message<T>>(async (resolve, reject) => {
		if (options?.signal?.aborted) return reject(new DiceError("Awaiting response aborted"));

		const internalAbort = new AbortController();

		let abortListener: (() => void) | undefined;
		let responseListener: ((message: Message, context: Client.Context) => void) | undefined;
		let timeout: NodeJS.Timeout | undefined;

		const clearListeners = () => {
			if (options?.sendAbortController) options.sendAbortController.abort();
			if (abortListener) {
				options?.signal?.removeEventListener("abort", abortListener);
				internalAbort.signal.removeEventListener("abort", abortListener);
			}
			if (responseListener) client.responseListenerMap.delete(assertions.source.address.key + assertions.body.type);
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

		client.responseListenerMap.set(assertions.source.address.key + assertions.body.type, {
			abort: internalAbort,
			listener: responseListener,
		});

		timeout = setTimeout(() => {
			clearListeners();

			reject(new DiceError("Awaiting response timed out"));
		}, options?.timeoutMs || 3_000);
	});
};
