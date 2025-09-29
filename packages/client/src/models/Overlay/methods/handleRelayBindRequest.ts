import { Overlay } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayRelayBindRequest = async (overlay: Overlay, request: Message<MessageBodyType.RELAY_BIND_REQUEST>, context: Overlay.Context): Promise<void> => {
	if (context.remoteAddress.type !== request.body.targetAddress.type) return;

	const nextRequest = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.BIND_REQUEST,
			transactionId: request.body.transactionId,
			sourceAddress: context.remoteAddress,
		},
	});

	await overlay.send(request.body.targetAddress, nextRequest.buffer);
};
