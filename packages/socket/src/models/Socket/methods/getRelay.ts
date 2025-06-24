import { Socket } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { RelayableBodyType } from "../../Message/BodyCodec";
import { RoutableTarget, Source, Target } from "../../Target/Codec";

export interface Relay {
	target: Target<Nat1Endpoint>;
	message: Message<"relay">;
}

export const getSocketRelay = (socket: Socket, source: Source, target: RoutableTarget, message: Message<RelayableBodyType>): Relay => {
	const relay = socket.overlay.getRelay(source, target);

	if (!relay) throw new DiceError("Cannot find relay for message");

	const relayMessage = Message.create(
		{
			node: socket.node,
			body: {
				type: "relay",
				target,
				body: message.body,
				signature: message.signature,
			},
		},
		socket.keys
	);

	return {
		message: relayMessage,
		target: relay,
	};
};
