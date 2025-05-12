import { Nat4Node } from "..";
import { Address } from "../../../Address";
import { SignatureCodec } from "../../../Keys/Codec";
import { Nat1Node } from "../../Nat1";

export const mockNat4Node = (properties?: Partial<Nat4Node.Properties>) =>
	new Nat4Node({
		address: Address.mock(),
		relayNode: Nat1Node.mock(),
		rSignature: {
			signature: crypto.getRandomValues(new Uint8Array(SignatureCodec.byteLength())),
			r: 0,
		},
		...properties,
	});
