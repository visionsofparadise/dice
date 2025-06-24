import { hex } from "@scure/base";
import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat4Endpoint } from "../../Endpoint/Nat4";
import { Message } from "../../Message";
import { MessageBodyMap } from "../../Message/BodyCodec";
import { NetworkAddress } from "../../NetworkAddress";
import { Node } from "../../Node";
import { RoutableTarget, Source } from "../../Target/Codec";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export interface SendSocketRevealOptions extends AwaitSocketResponseOptions {
	relayNode?: Node;
}

export const sendSocketReveal = async (
	socket: Socket,
	source: Source<Nat1Endpoint>,
	target: RoutableTarget<Nat4Endpoint>,
	body?: Partial<MessageBodyMap["reveal"]>,
	options?: SendSocketRevealOptions
): Promise<NetworkAddress> => {
	const cacheKey = `${hex.encode(target.diceAddress)}-${target.endpoint.networkAddress.family}`;

	const cacheItem = socket.cache.reveal.get(cacheKey);

	if (cacheItem?.value) return cacheItem?.value;

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "reveal",
				transactionId: createId(),
				target: {
					diceAddress: socket.node.diceAddress,
					endpoint: source.endpoint,
				},
				...body,
			},
		},
		socket.keys
	);

	const relay = socket.getRelay(source, target, request);

	await socket.send(source, relay.target, relay.message);

	const response = await socket.awaitResponse(
		{
			node: target,
			body: {
				type: "revealResponse",
				transactionId: request.body.transactionId,
			},
		},
		options
	);

	socket.cache.reveal.set(cacheKey, response.body.networkAddress);

	return response.body.networkAddress;
};
