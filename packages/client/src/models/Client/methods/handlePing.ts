import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientPing = async (client: Client, context: Client.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: MessageBodyType.PING_RESPONSE,
			reflectionAddress: context.remoteAddress,
		},
	});

	await client.sendAddress(context.remoteAddress, response.buffer);
};
