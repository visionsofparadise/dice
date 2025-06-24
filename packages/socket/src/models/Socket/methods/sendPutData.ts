import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { Node } from "../../Node";

export const sendSocketPutData = async (socket: Socket, node: Node, data: Uint8Array, body?: Partial<MessageBodyMap["putData"]>): Promise<void> => {
	const arc = Endpoint.getArc(socket.node.endpoints, node.endpoints);

	if (!arc) throw new DiceError("Cannot find arc for putData");

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "putData",
				data,
				...body,
			},
		},
		socket.keys
	);

	const route = await socket.route(arc.source, { diceAddress: node.diceAddress, endpoint: arc.target.endpoint }, request);

	await socket.send(route.source, route.target, route.message);
};
