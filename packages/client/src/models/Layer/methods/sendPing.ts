import { defaults } from "lodash-es";
import { Layer } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType, PingBody } from "../../Message/BodyCodec";
import { AwaitResponseOptions } from "../../ResponseCorrelator";
import { createTransactionId } from "../../TransactionId/Codec";
import { SendOverlayOptions } from "./send";

export const sendOverlayPing = async (layer: Layer, address: Address, body?: Partial<PingBody>, options?: AwaitResponseOptions & SendOverlayOptions): Promise<void> => {
	if (layer.state !== Layer.STATE.OPENED) {
		throw new DiceError("Cannot ping: layer is not opened");
	}

	const request = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.PING,
			transactionId: createTransactionId(),
			...body,
		},
	});

	const abortController = new AbortController();

	await Promise.all([
		layer.send(address, request.buffer, { ...options, signal: abortController.signal }),
		layer.correlator.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.PONG,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, layer.options)
		),
	]);
};
