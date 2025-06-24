import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { Node } from "../../Node";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export const sendSocketPing = async (socket: Socket, node: Node, body?: Partial<MessageBodyMap["ping"]>, options?: AwaitSocketResponseOptions): Promise<Node> => {
	const arc = Endpoint.getArc(socket.node.endpoints, node.endpoints);

	if (!arc) throw new DiceError("Cannot find arc for ping");

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "ping",
				transactionId: createId(),
				...body,
			},
		},
		socket.keys
	);

	const route = await socket.route(arc.source, { diceAddress: node.diceAddress, endpoint: arc.target.endpoint }, request);

	await socket.send(route.source, route.target, route.message);

	const response = await socket.awaitResponse(
		{
			node,
			body: {
				type: "successResponse",
				transactionId: request.body.transactionId,
			},
		},
		options
	);

	return response.node;
};
