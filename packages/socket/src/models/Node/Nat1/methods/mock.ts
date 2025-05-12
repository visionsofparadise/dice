import { Nat1Node } from "..";
import { Address } from "../../../Address";
import { SignatureCodec } from "../../../Keys/Codec";

export const mockNat1Node = (properties?: Partial<Nat1Node.Properties>) =>
	new Nat1Node({
		address: Address.mock(),
		rSignature: {
			signature: crypto.getRandomValues(new Uint8Array(SignatureCodec.byteLength())),
			r: 0,
		},
		...properties,
	});
