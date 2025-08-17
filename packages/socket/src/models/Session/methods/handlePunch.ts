import { Session } from "..";
import { Message } from "../../Message";

export const handleSessionPunch = async (session: Session, request: Message<"punch">): Promise<void> => {
	if (request.body.targetAddress.key !== session.endpoint?.address.key) {
		await session.sendUdpMessage(request.body.targetAddress, request);
	} else {
		const response = new Message({
			body: {
				type: "punchResponse",
				transactionId: request.body.transactionId,
			},
		});

		await session.sendUdpMessage(request.body.sourceAddress, response);
	}
};
