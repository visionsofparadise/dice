import { Socket } from "..";
import { Message } from "../../Message";

export const handleSocketPunch = async (socket: Socket, request: Message<"punch">, context: Socket.MessageContext): Promise<void> => {
	const response = Message.create(
		{
			node: socket.node,
			body: {
				type: "successResponse",
				transactionId: request.body.transactionId,
			},
		},
		socket.keys
	);

	return socket.send(context.local, { endpoint: request.body.endpoint }, response);
};
