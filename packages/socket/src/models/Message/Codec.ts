import { Codec } from "bufferfy";
import { Message } from ".";
import { NodeCodec } from "../Node/Codec";
import { MessageBodyCodec } from "./BodyCodec";

export const MessagePropertiesCodec = Codec.Object({
	sourceNode: NodeCodec,
	targetNode: NodeCodec,
	body: MessageBodyCodec,
});

export interface MessageProperties extends Codec.Type<typeof MessagePropertiesCodec> {}

export const MessageCodec = Codec.Transform(MessagePropertiesCodec, {
	isValid: (value) => value instanceof Message,
	decode: (properties, buffer) => {
		const message = new Message(properties);

		message.buffer = buffer;

		return message;
	},
	encode: (message) => message.properties,
});
