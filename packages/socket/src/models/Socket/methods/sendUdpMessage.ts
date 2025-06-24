import { Socket } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { Target } from "../../Target/Codec";

export const sendSocketUdpMessage = async (socket: Socket, udpSocket: Socket.UdpSocket, target: Target<Nat1Endpoint | Nat3Endpoint>, message: Message): Promise<void> => {
	if (socket.state !== Socket.STATE.OPENED) throw new DiceError("Socket is closed");

	socket.logger?.debug(`Sending message ${message.body.type} to ${target.endpoint.networkAddress.toString()}`);

	return new Promise<void>((resolve, reject) => {
		udpSocket.send(message.buffer, target.endpoint.networkAddress.port, target.endpoint.networkAddress.address, (error) => {
			if (error) {
				socket.logger?.error(error);

				return reject(new DiceError("Sending failed"));
			}

			return resolve();
		});
	});
};
