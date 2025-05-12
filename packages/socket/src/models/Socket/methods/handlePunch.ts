import { Socket } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { NatType } from "../../Node/Constant";

export const handleSocketPunch = (socket: Socket, request: Message<"punch">): [Message<"response">, Address] | undefined => {
	if (request.sourceNode.natType === NatType.NAT4) {
		socket.emit("error", new Error("Cannot punch nat4 node"));

		return;
	}

	return [
		new Message({
			sourceNode: socket.node,
			targetNode: request.sourceNode,
			body: {
				type: "response",
				transactionId: request.body.transactionId,
				code: ResponseCode.SUCCESS_NO_CONTENT,
			},
		}),
		request.sourceNode.address,
	];
};
