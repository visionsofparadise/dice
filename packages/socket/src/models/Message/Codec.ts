import { Codec } from "bufferfy";
import { Message } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { SignatureCodec } from "../Keys/Codec";
import { NodeCodec } from "../Node/Codec";
import { MessageBodyCodec } from "./BodyCodec";

export const MessagePropertiesCodec = Codec.Object({
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	node: NodeCodec,
	body: MessageBodyCodec,
	signature: SignatureCodec,
});

export interface MessageProperties extends Codec.Type<typeof MessagePropertiesCodec> {}

export const MessageCodec = Codec.Transform(MessagePropertiesCodec, {
	isValid: (value) => value instanceof Message,
	decode: (properties, buffer) => new Message(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (message) => message.properties,
});
