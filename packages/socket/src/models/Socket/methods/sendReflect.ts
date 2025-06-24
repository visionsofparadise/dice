import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { NetworkAddress } from "../../NetworkAddress";
import { RoutableTarget } from "../../Target/Codec";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export const sendSocketReflect = async (
	socket: Socket,
	udpSocket: Socket.UdpSocket,
	target: RoutableTarget<Nat1Endpoint>,
	body?: Partial<MessageBodyMap["reflect"]>,
	options?: AwaitSocketResponseOptions
): Promise<NetworkAddress> => {
	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "reflect",
				transactionId: createId(),
				...body,
			},
		},
		socket.keys
	);

	await new Promise<void>((resolve, reject) => {
		udpSocket.send(request.buffer, target.endpoint.networkAddress.port, target.endpoint.networkAddress.address, (error) => {
			if (error) {
				socket.logger?.error(error);

				return reject(new DiceError("Sending failed"));
			}

			return resolve();
		});
	});

	const response = await socket.awaitResponse(
		{
			node: target,
			body: {
				type: "reflectResponse",
				transactionId: request.body.transactionId,
			},
		},
		options
	);

	return response.body.networkAddress;
};
