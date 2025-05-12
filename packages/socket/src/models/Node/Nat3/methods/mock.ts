import { Nat3Node } from "..";
import { Address } from "../../../Address";
import { SignatureCodec } from "../../../Keys/Codec";
import { Nat1Node } from "../../Nat1";

export const mockNat3Node = (properties?: Partial<Nat3Node.Properties>) =>
	new Nat3Node({
		address: Address.mock(),
		relayNode: Nat1Node.mock(),
		rSignature: {
			signature: crypto.getRandomValues(new Uint8Array(SignatureCodec.byteLength())),
			r: 0,
		},
		...properties,
	});
