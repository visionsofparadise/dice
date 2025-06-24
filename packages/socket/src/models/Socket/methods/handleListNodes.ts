import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

export const handleSocketListNodes = async (socket: Socket, request: Message<"listNodes">): Promise<void> => {
	const arc = Endpoint.getArc(socket.node.endpoints, request.node.endpoints);

	if (!arc) throw new DiceError("Cannot find arc for listNodesResponse");

	const nodes = socket.overlay.table.listClosestToId(request.body.diceAddress);

	const response = Message.create(
		{
			node: socket.node,
			body: {
				type: "listNodesResponse",
				transactionId: request.body.transactionId,
				nodes,
			},
		},
		socket.keys
	);

	const route = await socket.route(arc.source, { diceAddress: request.node.diceAddress, endpoint: arc.target.endpoint }, response);

	return socket.send(route.source, route.target, route.message);
};
