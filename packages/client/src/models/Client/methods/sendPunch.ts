import { defaults, sampleSize } from "@technically/lodash";
import { Client } from "..";
import { Endpoint } from "../../Endpoint";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType, RelayPunchBody } from "../../Message/BodyCodec";
import { AwaitClientResponseOptions } from "./awaitResponse";
import { SendClientAddressOptions } from "./sendAddress";

export const sendClientPunch = async (client: Client, endpoint: Endpoint, body?: Partial<RelayPunchBody>, options?: AwaitClientResponseOptions & SendClientAddressOptions): Promise<void> => {
	if (!endpoint.address) throw new DiceError("Invalid punch target address");

	if (client.endpoint.address && client.cache.punchOut.has(client.endpoint.address.key + endpoint.address.key)) {
		return;
	}

	await client.noop(endpoint.address);

	const request = new Message({
		body: {
			type: MessageBodyType.RELAY_PUNCH,
			targetAddress: endpoint.address,
			...body,
		},
	});

	const relayAddresses = sampleSize(endpoint.relayAddresses, client.options.concurrency);

	const abortController = new AbortController();

	await Promise.all([
		...relayAddresses.map(async (address) => {
			return client.sendAddress(address, request.buffer, { ...options, signal: abortController.signal });
		}),
		client.awaitResponse(
			{
				source: {
					address: endpoint.address,
				},
				body: {
					type: MessageBodyType.PUNCH_RESPONSE,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, client.options)
		),
	]);
};
