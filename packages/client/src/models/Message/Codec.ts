import { Codec } from "bufferfy";
import { Message } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { MessageBodyCodec } from "./BodyCodec";

export enum VERSION {
	V0,
}

export const MessagePropertiesCodec = Codec.Object({
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	version: Codec.Enum([VERSION.V0], Codec.UInt(8)),
	body: MessageBodyCodec,
});

export interface MessageProperties extends Codec.Type<typeof MessagePropertiesCodec> {}

export const MessageCodec = Codec.Transform(MessagePropertiesCodec, {
	isValid: (value) => value instanceof Message,
	decode: (properties) => new Message(properties),
	encode: (message) => message.properties,
});
