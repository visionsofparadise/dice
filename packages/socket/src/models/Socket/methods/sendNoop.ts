import { Socket } from "..";
import { Message } from "../../Message";
import { Node } from "../../Node/Codec";

export const sendSocketNoop = async (socket: Socket, targetNode: Node, properties?: Partial<Message.Properties<"noop">>): Promise<void> => {
	const request = new Message({
		...properties,
		sourceNode: socket.node,
		targetNode,
		body: {
			type: "noop",
		},
	});

	await socket.send(request);
};
