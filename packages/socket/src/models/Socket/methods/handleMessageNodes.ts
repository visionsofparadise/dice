import { Socket } from "..";
import { Message } from "../../Message";

export const handleSocketMessageNodes = (socket: Socket, message: Message): void => {
	for (const node of message.nodes) {
		socket.overlay.put(node);
		socket.emit("remoteNode", node);
	}
};
