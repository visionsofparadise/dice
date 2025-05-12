import { Socket } from "..";
import { Node } from "../../Node/Codec";

export const processSocketNode = async (socket: Socket, node: Node): Promise<void> => {
	socket.overlay.put(node);

	if ("relayNode" in node) {
		await socket.processNode(node.relayNode);
	} else {
		await socket.updateRelayNode(node);
	}

	socket.emit("node", node);
};
