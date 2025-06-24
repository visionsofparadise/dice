import { Node } from "..";
import { SignatureCodec } from "../../Keys/Codec";

export const mockNode = (properties?: Partial<Node.Properties>) =>
	new Node({
		rSignature: {
			recoveryBit: 0,
			signature: crypto.getRandomValues(new Uint8Array(SignatureCodec.byteLength())),
		},
		...properties,
	});
