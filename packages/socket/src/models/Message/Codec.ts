import { Codec } from "bufferfy";
import { Message } from ".";
import { MessageBodyCodec } from "./BodyCodec";

export const MessagePropertiesCodec = Codec.Object({
	body: MessageBodyCodec,
});

export interface MessageProperties extends Codec.Type<typeof MessagePropertiesCodec> {}

export const MessageCodec = Codec.Transform(MessagePropertiesCodec, {
	isValid: (value) => value instanceof Message,
	decode: (properties) => new Message(properties),
	encode: (message) => message.properties,
});
