import { Message } from "..";
import { SignatureCodec } from "../../Keys/Codec";
import { Node } from "../../Node";

export const mockMessage = (properties?: Partial<Message.Properties>) =>
	new Message({
		node: Node.mock(),
		body: {
			type: "noop",
		},
		signature: crypto.getRandomValues(new Uint8Array(SignatureCodec.byteLength())),
		...properties,
	});
