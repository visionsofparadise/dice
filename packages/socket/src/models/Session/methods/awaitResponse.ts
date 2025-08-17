import { hex } from "@scure/base";
import { compare } from "uint8array-tools";
import { Session } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export interface AwaitSessionResponseOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}

export interface ResponseBodyAssertions<T extends MessageBodyType> {
	source?: {
		address: {
			key: string;
		};
	};
	body: {
		type?: T;
		transactionId: Uint8Array;
	};
}

export const awaitSessionResponse = async <T extends MessageBodyType = MessageBodyType>(
	session: Session,
	assertions: ResponseBodyAssertions<T>,
	options?: AwaitSessionResponseOptions
): Promise<Message<T>> => {
	return new Promise<Message<T>>(async (resolve, reject) => {
		if (options?.signal?.aborted) return reject(new DiceError("Awaiting response aborted"));

		const internalAbort = new AbortController();

		let abortListener: (() => void) | undefined;
		let responseListener: ((message: Message, context: Session.Context) => void) | undefined;
		let timeout: NodeJS.Timeout | undefined;

		const clearListeners = () => {
			if (abortListener) {
				options?.signal?.removeEventListener("abort", abortListener);
				internalAbort.signal.removeEventListener("abort", abortListener);
			}
			if (responseListener) session.responseListenerMap.delete(hex.encode(assertions.body.transactionId));
			if (timeout) clearTimeout(timeout);
		};

		abortListener = () => {
			clearListeners();

			reject(new DiceError("Awaiting response aborted"));
		};

		options?.signal?.addEventListener("abort", abortListener);
		internalAbort.signal.addEventListener("abort", abortListener);

		responseListener = (response: Message, context: Session.Context) => {
			if (
				(assertions.body.type && assertions.body.type !== response.body.type) ||
				!("transactionId" in response.body) ||
				compare(response.body.transactionId, assertions.body.transactionId) !== 0 ||
				(assertions.source?.address.key && context.remoteAddress.key !== assertions.source.address.key)
			)
				return;

			clearListeners();

			if (assertions.source instanceof Nat1Endpoint) {
				if (session.cache.pool.has(context.remoteAddress.key) || (!session.cache.pool.isFull && session.isValidPoolAddress(context.remoteAddress))) {
					session.cache.pool.set(context.remoteAddress.key, context.remoteAddress);
				}
			}

			resolve(response as Message<T>);
		};

		session.responseListenerMap.set(hex.encode(assertions.body.transactionId), {
			abort: internalAbort,
			listener: responseListener,
		});

		timeout = setTimeout(() => {
			clearListeners();

			if (assertions.source instanceof Nat1Endpoint) session.cache.pool.delete(assertions.source.address.key);

			reject(new DiceError("Awaiting response timed out"));
		}, options?.timeoutMs || 3_000);
	});
};
