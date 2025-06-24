import { Socket } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Message } from "../../Message";
import { Target } from "../../Target/Codec";

export const handleSocketReflect = async (socket: Socket, request: Message<"reflect">, context: Socket.MessageContext): Promise<void> => {
	const response = Message.create(
		{
			node: socket.node,
			body: {
				type: "reflectResponse",
				transactionId: request.body.transactionId,
				networkAddress: context.remote.networkAddress,
			},
		},
		socket.keys
	);

	const target: Target<Nat1Endpoint> = {
		endpoint: new Nat1Endpoint(context.remote),
	};

	await socket.send(context.local, target, response);
};
