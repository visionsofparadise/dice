import { Session } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";

export const sendSessionNoop = async (session: Session, networkAddress: Address): Promise<void> => {
	const request = new Message({
		body: {
			type: "noop",
		},
	});

	await session.sendUdpMessage(networkAddress, request);
};
