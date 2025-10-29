import { Layer } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayBindRequest = async (layer: Layer, request: Message<MessageBodyType.BIND_REQUEST>): Promise<void> => {
	const response = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.BIND,
			transactionId: request.body.transactionId,
		},
	});

	await layer.send(request.body.sourceAddress, response.buffer);

	if (layer.external) {
		layer.bindings.establishInboundBinding(request.body.sourceAddress.key, layer.external.key);
	}
};
