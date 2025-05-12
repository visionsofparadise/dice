import { Codec } from "bufferfy";
import { Socket } from "..";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { NodeCodec } from "../../Node/Codec";

export const handleSocketListNodes = (socket: Socket, request: Message<"listNodes">): [Message<"response">, undefined] => {
	const nodes = socket.overlay.table.listClosestToId(request.body.publicKey);

	return [
		new Message({
			sourceNode: socket.node,
			targetNode: request.sourceNode,
			body: {
				type: "response",
				transactionId: request.body.transactionId,
				code: ResponseCode.SUCCESS,
				body: Codec.Array(NodeCodec).encode(nodes),
			},
		}),
		undefined,
	];
};
