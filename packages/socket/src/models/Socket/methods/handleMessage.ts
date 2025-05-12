import { Socket } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { NatType } from "../../Node/Constant";

export const handleSocketMessage = async (socket: Socket, message: Message, context: Socket.MessageContext) => {
	try {
		// socket.logger?.debug(
		// 	`MESSAGE RECEIVED\nid: ${hex.encode(message.messageId)}${"transactionId" in message.body ? `\ntid: ${hex.encode(message.body.transactionId)}` : ""}\ntype: ${message.body.type}\nfrom: ${base58.encode(message.sourceNode.publicKey)}\nto: ${base58.encode(message.targetNode.publicKey)}\nremote: ${remoteAddress.toString()}`
		// );

		if (message.targetNode.address.toString() === socket.node.address.toString()) {
			let response: [Message<"response">, Address | undefined] | undefined;

			switch (message.body.type) {
				case "ping": {
					response = socket.handlePing(message as Message<"ping">);

					break;
				}
				case "reflect": {
					response = socket.handleReflect(message as Message<"reflect">, context.remoteInfo);

					break;
				}
				case "punch": {
					response = socket.handlePunch(message as Message<"punch">);

					break;
				}
				case "listNodes": {
					response = socket.handleListNodes(message as Message<"listNodes">);

					break;
				}
				case "putData": {
					socket.emit("data", message.body.data, { ...context, message });

					break;
				}
			}

			if (response) await socket.send(...response);
		} else {
			socket.logger?.debug(`Forwarding to ${message.targetNode.address.toString()}`);

			await socket.send(message);
			await socket.processNode(message.targetNode);
		}

		await socket.processNode(message.sourceNode);

		const remoteAddress = Address.fromRemoteInfo(context.remoteInfo);
		const cacheKey = socket.createCacheKey(remoteAddress);

		socket.cache.contact.set(cacheKey);

		if (socket.overlay.addressSet.has(remoteAddress.toString())) {
			socket.cache.health.set(cacheKey);
		}

		if (socket.node.natType !== NatType.NAT4) {
			socket.cache.punch.set(cacheKey);
		}
	} catch (error) {
		socket.emit("error", error);
	}
};
