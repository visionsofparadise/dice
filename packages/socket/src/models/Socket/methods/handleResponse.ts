import { hex } from "@scure/base";
import { Socket } from "..";
import { Message } from "../../Message";
import { ResponseBodyType } from "./awaitResponse";

export const handleSocketResponse = async (socket: Socket, response: Message<ResponseBodyType>, context: Socket.MessageContext): Promise<void> => {
	const responseListener = socket.responseListenerMap.get(hex.encode(response.body.transactionId));

	if (!responseListener) return;

	await responseListener(response, context);
};
