import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Keys } from "../../Keys";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { Node } from "../../Node";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export interface SendListNodesOptions extends AwaitSocketResponseOptions {
	isAddingNodes: boolean;
}

export const sendSocketListNodes = async (
	socket: Socket,
	node: Node,
	diceAddress: Uint8Array,
	body?: Partial<MessageBodyMap["listNodes"]>,
	options?: AwaitSocketResponseOptions
): Promise<Array<Node>> => {
	const arc = Endpoint.getArc(socket.node.endpoints, node.endpoints);

	if (!arc) throw new DiceError("Cannot find arc for listNodes");

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "listNodes",
				transactionId: createId(),
				diceAddress: Keys.normalizeAddress(diceAddress),
				...body,
			},
		},
		socket.keys
	);

	const route = await socket.route(arc.source, { diceAddress: node.diceAddress, endpoint: arc.target.endpoint }, request);

	await socket.send(route.source, route.target, route.message);

	const responseBody = await socket.awaitResponse(
		{
			node,
			body: {
				type: "listNodesResponse",
				transactionId: request.body.transactionId,
			},
		},
		options
	);

	return responseBody.nodes;
};
