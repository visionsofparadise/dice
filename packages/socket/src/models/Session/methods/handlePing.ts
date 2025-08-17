import { Session } from "..";
import { Message } from "../../Message";

export const handleSessionPing = async (session: Session, request: Message<"ping">, context: Session.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: "pingResponse",
			transactionId: request.body.transactionId,
		},
	});

	await session.sendUdpMessage(context.remoteAddress, response);
};
