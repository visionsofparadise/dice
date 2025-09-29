import { Overlay } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const sendOverlayNoop = async (overlay: Overlay, address: Address): Promise<void> => {
	const request = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.NOOP,
		},
	});

	await overlay.send(address, request.buffer);
};
