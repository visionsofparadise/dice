import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

export const handleSocketPing = async (socket: Socket, request: Message<"ping">): Promise<void> => {
	const arc = Endpoint.getArc(socket.node.endpoints, request.node.endpoints);

	if (!arc) throw new DiceError("Cannot find arc for pingResponse");

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

	const route = await socket.route(arc.source, { diceAddress: request.node.diceAddress, endpoint: arc.target.endpoint }, response);

	return socket.send(route.source, route.target, route.message);
};
