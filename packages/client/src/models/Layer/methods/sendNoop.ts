import { Layer } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const sendOverlayNoop = async (layer: Layer, address: Address): Promise<void> => {
	if (layer.state !== Layer.STATE.OPENED) {
		throw new DiceError("Cannot send noop: layer is not opened");
	}

	const request = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.NOOP,
		},
	});

	await layer.send(address, request.buffer);
};
