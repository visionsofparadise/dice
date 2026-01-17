import { Codec } from "bufferfy";
import { Message } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { MessageBodyCodec } from "./BodyCodec";

export enum MessageVersion {
	V0,
}

export const MessagePropertiesCodec = Codec.Object({
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	version: Codec.Enum([MessageVersion.V0], Codec.UInt(8)),
	flags: Codec.BitField(["isNotCandidate"]),
	body: MessageBodyCodec,
});

export interface MessageProperties extends Codec.Type<typeof MessagePropertiesCodec> {}

export const MessageCodec = Codec.Transform(MessagePropertiesCodec, {
	isValid: (value) => value instanceof Message,
	decode: (properties, buffer) => new Message(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (message) => message.properties,
});
