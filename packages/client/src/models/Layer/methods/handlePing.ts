import { Layer } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayPing = async (layer: Layer, request: Message<MessageBodyType.PING>, context: Layer.Context): Promise<void> => {
	const response = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.PONG,
			transactionId: request.body.transactionId,
			reflectionAddress: context.remoteAddress,
		},
	});

	await layer.send(context.remoteAddress, response.buffer);
};
