import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientPing = async (client: Client, request: Message<MessageBodyType.PING>, context: Client.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: MessageBodyType.PING_RESPONSE,
			transactionId: request.body.transactionId,
			reflectionAddress: context.remoteAddress,
		},
	});

	await client.sendAddress(context.remoteAddress, response.buffer);
};
