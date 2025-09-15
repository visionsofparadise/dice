import { hex } from "@scure/base";
import { Client } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleClientMessage = async (client: Client, message: Message, context: Client.Context) => {
	try {
		client.logger?.debug(`Handling message ${message.body.type} from ${context.remoteAddress.toString()}`);

		switch (message.body.type) {
			case MessageBodyType.NOOP:
				break;
			case MessageBodyType.PING: {
				client.handlePing(message as Message<MessageBodyType.PING>, context);

				break;
			}
			case MessageBodyType.RELAY_PUNCH: {
				client.handleRelayPunch(message as Message<MessageBodyType.RELAY_PUNCH>, context);

				break;
			}
			case MessageBodyType.PUNCH: {
				client.handlePunch(message as Message<MessageBodyType.PUNCH>);

				break;
			}
			case MessageBodyType.LIST: {
				client.handleList(message as Message<MessageBodyType.LIST>, context);

				break;
			}
			default: {
				const responseListener = client.responseListenerMap.get(context.remoteAddress.key + message.body.type + hex.encode(message.body.transactionId))?.listener;

				if (responseListener) responseListener(message, context);

				break;
			}
		}

		if ("reflectionAddress" in message.body) {
			client.handleReflection(context.remoteAddress, message.body.reflectionAddress);
		}

		client.handleAddress(context.remoteAddress);
	} catch (error) {
		client.events.emit("error", error);
	}
};
