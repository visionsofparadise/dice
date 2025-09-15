import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientList = async (client: Client, request: Message<MessageBodyType.LIST>, context: Client.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: MessageBodyType.LIST_RESPONSE,
			transactionId: request.body.transactionId,
			addresses: client.endpoint.relayAddresses,
			reflectionAddress: context.remoteAddress,
		},
	});

	await client.sendAddress(context.remoteAddress, response.buffer);
};
