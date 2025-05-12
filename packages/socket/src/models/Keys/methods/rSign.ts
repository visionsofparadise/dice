import { secp256k1 } from "@noble/curves/secp256k1";
import { Keys } from "..";
import { RSignature } from "../Codec";

export const rSignKeys = (keys: Keys, message: Uint8Array): RSignature => {
	const signature = secp256k1.sign(message, keys.privateKey, { prehash: false });
	const r = signature.recovery;

	return {
		signature: signature.toCompactRawBytes(),
		r,
	};
};
