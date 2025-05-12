import { Message } from "..";
import { Nat1Node } from "../../Node/Nat1";

export const mockMessage = (properties?: Partial<Message.Properties>) =>
	new Message({
		sourceNode: Nat1Node.mock(),
		targetNode: Nat1Node.mock(),
		body: {
			type: "noop",
		},
		...properties,
	});
