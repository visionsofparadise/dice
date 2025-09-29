import { hex } from "@scure/base";
import { Overlay } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayMessage = async (overlay: Overlay, message: Message, context: Overlay.Context) => {
	try {
		overlay.logger?.debug(`Handling message ${message.body.type} from ${context.remoteAddress.toString()}`);

		switch (message.body.type) {
			case MessageBodyType.NOOP:
				break;
			case MessageBodyType.PING: {
				overlay.handlePing(message as Message<MessageBodyType.PING>, context);

				break;
			}
			case MessageBodyType.RELAY_BIND_REQUEST: {
				overlay.handleRelayBindRequest(message as Message<MessageBodyType.RELAY_BIND_REQUEST>, context);

				break;
			}
			case MessageBodyType.BIND_REQUEST: {
				overlay.handleBindRequest(message as Message<MessageBodyType.BIND_REQUEST>);

				break;
			}
			case MessageBodyType.LIST: {
				overlay.handleList(message as Message<MessageBodyType.LIST>, context);

				break;
			}
			default: {
				const responseListener = overlay.responseListenerMap.get(context.remoteAddress.key + message.body.type + hex.encode(message.body.transactionId))?.listener;

				if (responseListener) responseListener(message, context);

				break;
			}
		}

		if ("reflectionAddress" in message.body) {
			overlay.handleReflection(context.remoteAddress, message.body.reflectionAddress);
		}

		overlay.handleAddress(context.remoteAddress, message);
	} catch (error) {
		overlay.events.emit("error", error);
	}
};
