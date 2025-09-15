import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientRelayPunch = async (client: Client, request: Message<MessageBodyType.RELAY_PUNCH>, context: Client.Context): Promise<void> => {
	const nextRequest = new Message({
		body: {
			type: MessageBodyType.PUNCH,
			transactionId: request.body.transactionId,
			sourceAddress: context.remoteAddress,
		},
	});

	await client.sendAddress(request.body.targetAddress, nextRequest.buffer);
};
