import { Codec } from "bufferfy";
import { Keys } from ".";
import { ShortHashCodec } from "../../utilities/Hash";

export const DiceAddressCodec = ShortHashCodec;

export const PrivateKeyCodec = Codec.Bytes(32);
export const PublicKeyCodec = Codec.Bytes(33);
export const SignatureCodec = Codec.Bytes(64);

export const RSignatureCodec = Codec.Object({
	recoveryBit: Codec.UInt(8),
	signature: SignatureCodec,
});

export interface RSignature extends Codec.Type<typeof RSignatureCodec> {}

export const KeysPropertiesCodec = Codec.Object({
	privateKey: PrivateKeyCodec,
});

export interface KeysProperties extends Codec.Type<typeof KeysPropertiesCodec> {}

export const KeysCodec = Codec.Transform(KeysPropertiesCodec, {
	isValid: (value) => value instanceof Keys,
	decode: (properties) => new Keys(properties),
	encode: (keys) => keys.properties,
});
