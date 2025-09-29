import { defaults } from "@technically/lodash";
import { Overlay } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { ListBody, MessageBodyType } from "../../Message/BodyCodec";
import { createTransactionId } from "../../TransactionId/Codec";
import { AwaitOverlayResponseOptions } from "./awaitResponse";
import { SendOverlayOptions } from "./send";

export const sendOverlayList = async (overlay: Overlay, address: Address, body?: Partial<ListBody>, options?: AwaitOverlayResponseOptions & SendOverlayOptions): Promise<Array<Address>> => {
	const request = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.LIST,
			transactionId: createTransactionId(),
			...body,
		},
	});

	const abortController = new AbortController();

	const [_, response] = await Promise.all([
		overlay.send(address, request.buffer, { ...options, signal: abortController.signal }),
		overlay.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.ADDRESSES,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, overlay.options)
		),
	]);

	return response.body.addresses;
};
