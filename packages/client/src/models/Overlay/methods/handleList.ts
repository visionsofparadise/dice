import { sampleSize } from "@technically/lodash";
import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Ipv6Address } from "../../Ipv6Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayList = async (overlay: Overlay, request: Message<MessageBodyType.LIST>, context: Overlay.Context): Promise<void> => {
	let addresses = overlay.coordinators.concat(sampleSize(overlay.candidates, 50 - overlay.coordinators.length));

	const response = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.ADDRESSES,
			transactionId: request.body.transactionId,
			addresses: addresses as Array<Ipv6Address> | Array<Ipv4Address>,
			reflectionAddress: context.remoteAddress,
		},
	});

	await overlay.send(context.remoteAddress, response.buffer);
};
