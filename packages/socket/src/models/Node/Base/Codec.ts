import { Codec } from "bufferfy";
import { RSignatureCodec } from "../../Keys/Codec";

export const BaseNodePropertiesCodec = Codec.Object({
	sequenceNumber: Codec.VarInt(60),
	generation: Codec.VarInt(60),
	isDisabled: Codec.Boolean,
	rSignature: RSignatureCodec,
});

export interface BaseNodeProperties extends Codec.Type<typeof BaseNodePropertiesCodec> {}
