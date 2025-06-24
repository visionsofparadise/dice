import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

export const handleSocketRelay = async (socket: Socket, request: Message<"relay">): Promise<void> => {
	const arc = Endpoint.getArc(socket.node.endpoints, [request.body.target.endpoint]);

	if (!arc) throw new DiceError("Cannot find arc for pingResponse");

	const response = new Message({
		node: request.node,
		body: request.body.body,
		signature: request.body.signature,
	});

	const route = await socket.route(arc.source, { diceAddress: request.body.target.diceAddress, endpoint: request.body.target.endpoint }, response);

	return socket.send(route.source, route.target, route.message);
};
