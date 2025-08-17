import { Session } from "..";
import { Message } from "../../Message";

export const handleSessionReflect = async (session: Session, request: Message<"reflect">, context: Session.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: "reflectResponse",
			transactionId: request.body.transactionId,
			address: context.remoteAddress,
		},
	});

	await session.sendUdpMessage(context.remoteAddress, response);
};
