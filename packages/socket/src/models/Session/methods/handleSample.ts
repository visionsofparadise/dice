import { sampleSize } from "@technically/lodash";
import { Session } from "..";
import { Message } from "../../Message";

export const handleSessionSample = async (session: Session, request: Message<"sample">, context: Session.Context): Promise<void> => {
	const response = new Message({
		body: {
			type: "sampleResponse",
			transactionId: request.body.transactionId,
			addresses: sampleSize([...session.cache.pool.values()], 20),
		},
	});

	await session.sendUdpMessage(context.remoteAddress, response);
};
