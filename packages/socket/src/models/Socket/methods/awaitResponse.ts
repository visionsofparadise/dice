import { compare } from "uint8array-tools";
import { Socket } from "..";
import { Message } from "../../Message";

export interface AwaitSocketResponseOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}

export const awaitSocketResponse = async (
	socket: Socket,
	transactionId: Uint8Array,
	options: AwaitSocketResponseOptions | undefined = socket.options.defaultAwaitResponseOptions
): Promise<Message<"response">> => {
	return new Promise<Message<"response">>(async (resolve, reject) => {
		if (options?.signal?.aborted) return reject(new Error("Sending aborted"));
		if (socket.state === Socket.STATE.CLOSED) return reject(new Error("Socket is closed"));

		let abortListener: (() => void) | undefined;
		let messageListener: ((message: Message) => void) | undefined;
		let timeout: NodeJS.Timeout | undefined;

		const clearHandlers = () => {
			if (abortListener) options?.signal?.removeEventListener("abort", abortListener);
			if (messageListener) socket.removeListener("message", messageListener);
			if (timeout) clearTimeout(timeout);
		};

		abortListener = () => {
			clearHandlers();

			reject(new Error("Sending aborted"));
		};

		options?.signal?.addEventListener("abort", abortListener);

		messageListener = (response: Message) => {
			try {
				if (response.body.type === "response" && response.body.transactionId && compare(response.body.transactionId, transactionId) === 0) {
					clearHandlers();

					if (response.body.code >= 300) return reject(response);

					return resolve(response as Message<"response">);
				}
			} catch (error) {
				socket.emit("error", error);
			}
		};

		socket.on("message", messageListener);

		timeout = setTimeout(() => {
			clearHandlers();

			reject(new Error("Sending timed out"));
		}, options?.timeoutMs || 3_000);
	});
};
