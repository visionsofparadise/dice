import { Socket } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";

export const sendSocketMessage = async (socket: Socket, message: Message, address?: Address): Promise<void> => {
	if (socket.state !== Socket.STATE.OPENED) throw new Error("Socket is closed");

	address ??= await socket.route(message);

	if (address.toString() === socket.node.address.toString()) {
		socket.emit("message", message, { socket, remoteInfo: address.toRemoteInfo(message.byteLength) });

		return;
	}

	return new Promise<void>((resolve, reject) => {
		socket.rawSocket.send(message.buffer, address.port, address.ip.value, (error) => {
			// socket.logger?.debug(
			// 	`MESSAGE SENT${"transactionId" in message.body ? `\ntid: ${hex.encode(message.body.transactionId)}` : ""}\ntype: ${message.body.type}\nfrom: ${base58.encode(message.sourceNode.publicKey)}\nto: ${base58.encode(message.targetNode.publicKey)}`
			// );

			if (error) {
				socket.logger?.error(error);

				return reject(new Error("Sending failed"));
			}

			return resolve();
		});
	});
};
