import { Codec } from "bufferfy";
import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { Node, NodeCodec } from "../../Node/Codec";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export interface SendListNodesOptions extends AwaitSocketResponseOptions {
	isAddingNodes: boolean;
}

export const sendSocketListNodes = async (
	socket: Socket,
	targetNode: Node,
	publicKey: Uint8Array,
	properties?: Partial<Message.Properties<"listNodes">>,
	options: SendListNodesOptions = { isAddingNodes: true }
): Promise<Array<Node>> => {
	const request = new Message({
		...properties,
		sourceNode: socket.node,
		targetNode,
		body: {
			type: "listNodes",
			transactionId: createId(),
			publicKey,
		},
	});

	await socket.send(request);

	const response = await socket.awaitResponse(request.body.transactionId, options);

	if (response.body.code !== ResponseCode.SUCCESS) throw new Error("Invalid response");

	try {
		const nodes = Codec.Array(NodeCodec).decode(response.body.body);

		if (options.isAddingNodes) await Promise.allSettled(nodes.map((node) => socket.processNode(node)));

		return nodes;
	} catch (error) {
		throw new Error("Invalid response");
	}
};
