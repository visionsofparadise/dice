import { Socket } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { Message } from "../../Message";
import { Target } from "../../Target/Codec";

export const sendSocketNoop = async (socket: Socket, udpSocket: Socket.UdpSocket, target: Target<Nat1Endpoint | Nat3Endpoint>): Promise<void> => {
	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "noop",
			},
		},
		socket.keys
	);

	await socket.sendUdp(udpSocket, target, request);
};
