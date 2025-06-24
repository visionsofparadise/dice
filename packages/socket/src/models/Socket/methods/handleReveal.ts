import { Socket } from "..";
import { Message } from "../../Message";

export const handleSocketReveal = async (socket: Socket, request: Message<"reveal">, context: Socket.MessageContext): Promise<void> => {
	const networkAddress = await socket.reflect(context.local.udpSocket, request.body.target);

	const response = Message.create(
		{
			node: socket.node,
			body: {
				type: "revealResponse",
				transactionId: request.body.transactionId,
				networkAddress,
			},
		},
		socket.keys
	);

	return socket.send(context.local, request.body.target, response);
};
