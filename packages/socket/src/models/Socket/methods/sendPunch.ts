import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Nat } from "../../Endpoint/Constant";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { NetworkAddress } from "../../NetworkAddress";
import { RoutableTarget, Source } from "../../Target/Codec";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export interface SendSocketPunchOptions extends AwaitSocketResponseOptions {
	isPrePunchDisabled?: boolean;
}

export const sendSocketPunch = async (
	socket: Socket,
	udpSocket: Socket.UdpSocket,
	target: RoutableTarget<Nat1Endpoint | Nat3Endpoint>,
	body?: Partial<MessageBodyMap["punch"]>,
	options?: SendSocketPunchOptions
): Promise<void> => {
	const endpoint = socket.internalEndpointMap.get(NetworkAddress.fromRemoteInfo(udpSocket.address()).toString());

	if (!endpoint || endpoint.nat === Nat.NAT4) throw new DiceError("Source endpoint for udpSocket not found");

	const cacheKey = `${endpoint.networkAddress.toString()}-${target.endpoint.networkAddress.toString()}`;

	if (!socket.cache.punch.has(cacheKey)) {
		if (!options?.isPrePunchDisabled) await socket.noop(udpSocket, target);

		const punchRequest = Message.create(
			{
				node: socket.node,
				body: {
					type: "punch",
					transactionId: createId(),
					endpoint,
					...body,
				},
			},
			socket.keys
		);

		const source: Source<Nat1Endpoint | Nat3Endpoint> = {
			endpoint,
		};

		const relay = socket.getRelay(source, target, punchRequest);

		await socket.sendUdp(udpSocket, relay.target, relay.message);

		await socket.awaitResponse(
			{
				node: target,
				body: {
					type: "successResponse",
					transactionId: punchRequest.body.transactionId,
				},
			},
			options
		);
	}
};
