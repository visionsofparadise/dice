import { Client } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const sendClientNoop = async (client: Client, address: Address): Promise<void> => {
	const request = new Message({
		body: {
			type: MessageBodyType.NOOP,
		},
	});

	await client.sendAddress(address, request.buffer);
};
