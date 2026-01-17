import { Codec } from "bufferfy";
import { Envelope } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { AddressCodec } from "../Address/Codec";

export enum EnvelopeVersion {
	V1,
}

export const EnvelopePropertiesCodec = Codec.Object({
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	version: Codec.Enum([EnvelopeVersion.V1], Codec.UInt(8)),
	flags: Codec.BitField([]), // Reserved for future use
	reflectionAddress: Codec.Optional(AddressCodec),
	payload: Codec.Bytes(),
});

export interface EnvelopeProperties extends Codec.Type<typeof EnvelopePropertiesCodec> {}

export const EnvelopeCodec = Codec.Transform(EnvelopePropertiesCodec, {
	isValid: (value) => value instanceof Envelope,
	decode: (properties, buffer) => new Envelope(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (envelope) => envelope.properties,
});
