import { defaults } from "@technically/lodash";
import { Client } from "..";
import { createId } from "../../../utilities/Id";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { MessageBodyType, PingBody } from "../../Message/BodyCodec";
import { AwaitClientResponseOptions } from "./awaitResponse";
import { SendClientAddressOptions } from "./sendAddress";

export const sendClientPing = async (client: Client, address: Address, body?: Partial<PingBody>, options?: AwaitClientResponseOptions & SendClientAddressOptions): Promise<void> => {
	const request = new Message({
		body: {
			type: MessageBodyType.PING,
			transactionId: createId(),
			...body,
		},
	});

	const abortController = new AbortController();

	await Promise.all([
		client.sendAddress(address, request.buffer, { ...options, signal: abortController.signal }),
		client.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.PING_RESPONSE,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, client.options)
		),
	]);
};
