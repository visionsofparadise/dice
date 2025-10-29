import { Layer } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { isValidPublicAddress } from "../../../utilities/isValidPublicAddress";

export const handleOverlayRelayBindRequest = async (layer: Layer, request: Message<MessageBodyType.RELAY_BIND_REQUEST>, context: Layer.Context): Promise<void> => {
	if (context.remoteAddress.type !== request.body.targetAddress.type) return;

	// Validate target address is a public, routable address
	if (!layer.options.isAddressValidationDisabled && !isValidPublicAddress(request.body.targetAddress)) {
		layer.logger?.debug(`Rejected relay bind request from ${context.remoteAddress.toString()}: target ${request.body.targetAddress.toString()} is not a valid public address`);
		return;
	}

	const nextRequest = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.BIND_REQUEST,
			transactionId: request.body.transactionId,
			sourceAddress: context.remoteAddress,
		},
	});

	await layer.send(request.body.targetAddress, nextRequest.buffer);
};
