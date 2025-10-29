import { Layer } from "..";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

export const handleOverlayMessage = async (layer: Layer, message: Message, context: Layer.Context) => {
	try {
		layer.logger?.debug(`Handling message ${message.body.type} from ${context.remoteAddress.toString()}`);

		switch (message.body.type) {
			case MessageBodyType.NOOP:
				break;
			case MessageBodyType.PING: {
				layer.handlePing(message as Message<MessageBodyType.PING>, context);

				break;
			}
			case MessageBodyType.RELAY_BIND_REQUEST: {
				layer.handleRelayBindRequest(message as Message<MessageBodyType.RELAY_BIND_REQUEST>, context);

				break;
			}
			case MessageBodyType.BIND_REQUEST: {
				layer.handleBindRequest(message as Message<MessageBodyType.BIND_REQUEST>);

				break;
			}
			default: {
				layer.correlator.handleIncomingResponse(message, context);

				break;
			}
		}

		if ("reflectionAddress" in message.body) {
			layer.handleReflection(context.remoteAddress, message.body.reflectionAddress);
		}

		layer.handleAddress(context.remoteAddress);
	} catch (error) {
		layer.events.emit("error", error);
	}
};
