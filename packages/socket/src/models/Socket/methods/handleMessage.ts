import { Socket } from "..";
import { Keys } from "../../Keys";
import { Message } from "../../Message";

export const handleSocketMessage = async (socket: Socket, message: Message, context: Socket.MessageContext) => {
	try {
		socket.logger?.debug(`Handling message ${message.body.type} from ${context.remote.networkAddress.toString()}`);

		if (!Keys.isVerified(message.signature, message.hash, message.node.publicKey)) return;

		socket.logger?.debug(`Verified message ${message.body.type} from ${context.remote.networkAddress.toString()}`);

		socket.handleMessageNodes(message);

		socket.logger?.debug(`Handled nodes from message ${message.body.type} from ${context.remote.networkAddress.toString()}`);

		switch (message.body.type) {
			case "noop": {
				break;
			}
			case "ping": {
				await socket.handlePing(message as Message<"ping">);

				break;
			}
			case "reflect": {
				await socket.handleReflect(message as Message<"reflect">, context);

				break;
			}
			case "reflectResponse": {
				await socket.handleResponse(message as Message<"reflectResponse">, context);

				break;
			}
			case "punch": {
				await socket.handlePunch(message as Message<"punch">, context);

				break;
			}
			case "reveal": {
				await socket.handleReveal(message as Message<"reveal">, context);

				break;
			}
			case "revealResponse": {
				await socket.handleResponse(message as Message<"revealResponse">, context);

				break;
			}
			case "listNodes": {
				await socket.handleListNodes(message as Message<"listNodes">);

				break;
			}
			case "listNodesResponse": {
				await socket.handleResponse(message as Message<"listNodesResponse">, context);

				break;
			}
			case "putData": {
				socket.emit("data", message.body.data, { ...context, message });

				break;
			}
			case "relay": {
				await socket.handleRelay(message as Message<"relay">);

				break;
			}
			case "successResponse": {
				await socket.handleResponse(message as Message<"successResponse">, context);

				break;
			}
			case "badRequestErrorResponse": {
				await socket.handleResponse(message as Message<"badRequestErrorResponse">, context);

				break;
			}
			case "internalErrorResponse": {
				await socket.handleResponse(message as Message<"internalErrorResponse">, context);

				break;
			}
		}

		socket.logger?.debug(`Handled message ${message.body.type} from ${context.remote.networkAddress.toString()}`);
	} catch (error) {
		socket.emit("error", error);
	}
};
