import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { Source, Target } from "../../Target/Codec";

export const sendSocketMessage = async (socket: Socket, source: Source<Endpoint>, target: Target<Nat1Endpoint | Nat3Endpoint>, message: Message): Promise<void> => {
	if (socket.state !== Socket.STATE.OPENED) throw new DiceError("Socket is closed");

	const udpSocket = socket.externalUdpSocketMap.get(source.endpoint.key);

	if (!udpSocket) throw new DiceError("Source endpoint udpSocket not found");

	return socket.sendUdp(udpSocket, target, message);
};
