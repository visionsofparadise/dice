import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientPunch = async (client: Client, request: Message<MessageBodyType.PUNCH>): Promise<void> => {
	if (client.endpoint.address && client.cache.punchIn.has(request.body.sourceAddress + client.endpoint.address.key)) {
		return;
	}

	const response = new Message({
		body: {
			type: MessageBodyType.PUNCH_RESPONSE,
			transactionId: request.body.transactionId,
		},
	});

	await client.sendAddress(request.body.sourceAddress, response.buffer);

	if (client.endpoint.address) {
		client.cache.punchIn.add(request.body.sourceAddress + client.endpoint.address.key);
	}
};
