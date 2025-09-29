import { defaults } from "@technically/lodash";
import { Overlay } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { MessageBodyType, PingBody } from "../../Message/BodyCodec";
import { createTransactionId } from "../../TransactionId/Codec";
import { AwaitOverlayResponseOptions } from "./awaitResponse";
import { SendOverlayOptions } from "./send";

export const sendOverlayPing = async (overlay: Overlay, address: Address, body?: Partial<PingBody>, options?: AwaitOverlayResponseOptions & SendOverlayOptions): Promise<void> => {
	const request = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.PING,
			transactionId: createTransactionId(),
			...body,
		},
	});

	const abortController = new AbortController();

	await Promise.all([
		overlay.send(address, request.buffer, { ...options, signal: abortController.signal }),
		overlay.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.PONG,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, overlay.options)
		),
	]);
};
