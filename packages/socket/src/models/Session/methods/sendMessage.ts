import { Session } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { Message } from "../../Message";

export const sendSessionMessage = async (session: Session, targetEndpoint: Endpoint, message: Message): Promise<void> => {
	if (targetEndpoint instanceof Nat3Endpoint) await session.punch(targetEndpoint);

	return session.sendUdpMessage(targetEndpoint.address, message);
};
