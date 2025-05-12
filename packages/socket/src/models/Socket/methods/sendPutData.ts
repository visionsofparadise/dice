import { Socket } from "..";
import { Message } from "../../Message";
import { Node } from "../../Node/Codec";

export const sendSocketPutData = async (socket: Socket, targetNode: Node, data: Uint8Array, properties?: Partial<Message.Properties<"putData">>): Promise<void> => {
	const request = new Message({
		...properties,
		sourceNode: socket.node,
		targetNode,
		body: {
			type: "putData",
			data,
		},
	});

	await socket.send(request);
};
