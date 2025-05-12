import { Socket } from "..";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";

export const handleSocketPing = (socket: Socket, request: Message<"ping">): [Message<"response">, undefined] => {
	return [
		new Message({
			sourceNode: socket.node,
			targetNode: request.sourceNode,
			body: {
				type: "response",
				transactionId: request.body.transactionId,
				code: ResponseCode.SUCCESS_NO_CONTENT,
			},
		}),
		undefined,
	];
};
