import { RemoteInfo } from "dgram";
import { Socket } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";

export const handleSocketReflect = (socket: Socket, request: Message<"reflect">, remoteInfo: RemoteInfo): [Message<"response">, Address] => {
	const address = Address.fromRemoteInfo(remoteInfo);

	const message = new Message({
		sourceNode: socket.node,
		targetNode: request.sourceNode,
		body: {
			type: "response",
			code: ResponseCode.SUCCESS,
			transactionId: request.body.transactionId,
			body: address.buffer,
		},
	});

	return [message, address];
};
