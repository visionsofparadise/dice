import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { Node } from "../../Node/Codec";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export const sendSocketPing = async (socket: Socket, targetNode: Node, properties?: Partial<Message.Properties<"ping">>, options?: AwaitSocketResponseOptions): Promise<Message<"response">> => {
	const request = new Message({
		...properties,
		sourceNode: socket.node,
		targetNode,
		body: {
			type: "ping",
			transactionId: createId(),
		},
	});

	await socket.send(request);

	const response = await socket.awaitResponse(request.body.transactionId, options);

	if (response.body.code !== ResponseCode.SUCCESS_NO_CONTENT) throw new Error("Invalid response");

	return response;
};
