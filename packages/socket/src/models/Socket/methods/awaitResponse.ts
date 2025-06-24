import { hex } from "@scure/base";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export interface AwaitSocketResponseOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}

export type ResponseBodyType = Extract<MessageBodyType, "reflectResponse" | "revealResponse" | "listNodesResponse" | "successResponse" | "badRequestErrorResponse" | "internalErrorResponse">;

export interface ResponseBodyAssertions<T extends ResponseBodyType> {
	node: {
		diceAddress: Uint8Array;
	};
	body: {
		type: T;
		transactionId: Uint8Array;
	};
}

export const awaitSocketResponse = async <T extends ResponseBodyType>(socket: Socket, assertions: ResponseBodyAssertions<T>, options?: AwaitSocketResponseOptions): Promise<Message<T>> => {
	options = { ...socket.options, ...options };

	const key = hex.encode(assertions.body.transactionId);

	return new Promise<Message<T>>(async (resolve, reject) => {
		if (options?.signal?.aborted) return reject(new DiceError("Awaiting response aborted"));
		if (socket.state === Socket.STATE.CLOSED) return reject(new DiceError("Socket is closed"));

		let abortListener: (() => void) | undefined;
		let responseListener: ((message: Message) => void) | undefined;
		let timeout: NodeJS.Timeout | undefined;

		const clearHandlers = () => {
			if (abortListener) {
				socket.closeController.signal.removeEventListener("abort", abortListener);
				options?.signal?.removeEventListener("abort", abortListener);
			}

			if (responseListener) socket.responseListenerMap.delete(key);
			if (timeout) clearTimeout(timeout);
		};

		abortListener = () => {
			clearHandlers();

			reject(new DiceError("Awaiting response aborted"));
		};

		socket.closeController.signal.addEventListener("abort", abortListener);
		options?.signal?.addEventListener("abort", abortListener);

		responseListener = (response: Message) => {
			clearHandlers();

			if (response.body.type === assertions.body.type && compare(response.node.diceAddress, assertions.node.diceAddress) === 0) {
				return resolve(response as Message<T>);
			}

			return reject(response);
		};

		socket.responseListenerMap.set(key, responseListener);

		timeout = setTimeout(() => {
			clearHandlers();

			reject(new DiceError("Awaiting response timed out"));
		}, options?.timeoutMs || 3_000);
	});
};
