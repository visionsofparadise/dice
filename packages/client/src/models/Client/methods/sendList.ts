import { defaults } from "@technically/lodash";
import { Client } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { ListBody, MessageBodyType } from "../../Message/BodyCodec";
import { createTransactionId } from "../../TransactionId/Codec";
import { AwaitClientResponseOptions } from "./awaitResponse";
import { SendClientAddressOptions } from "./sendAddress";

export const sendClientList = async (client: Client, address: Address, body?: Partial<ListBody>, options?: AwaitClientResponseOptions & SendClientAddressOptions): Promise<Array<Address>> => {
	const request = new Message({
		body: {
			type: MessageBodyType.LIST,
			transactionId: createTransactionId(),
			...body,
		},
	});

	const abortController = new AbortController();

	const [_, response] = await Promise.all([
		client.sendAddress(address, request.buffer, { ...options, signal: abortController.signal }),
		client.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.LIST_RESPONSE,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, client.options)
		),
	]);

	return response.body.addresses;
};
