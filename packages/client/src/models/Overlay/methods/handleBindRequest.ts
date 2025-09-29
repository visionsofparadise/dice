import { Overlay } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayBindRequest = async (overlay: Overlay, request: Message<MessageBodyType.BIND_REQUEST>): Promise<void> => {
	const response = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.BIND,
			transactionId: request.body.transactionId,
		},
	});

	await overlay.send(request.body.sourceAddress, response.buffer);

	if (overlay.external) {
		overlay.cache.bindIn.add(request.body.sourceAddress.key, overlay.external.key);
	}
};
