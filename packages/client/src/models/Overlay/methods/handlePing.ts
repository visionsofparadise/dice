import { Overlay } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayPing = async (overlay: Overlay, request: Message<MessageBodyType.PING>, context: Overlay.Context): Promise<void> => {
	const response = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.PONG,
			transactionId: request.body.transactionId,
			reflectionAddress: context.remoteAddress,
		},
	});

	await overlay.send(context.remoteAddress, response.buffer);
};
