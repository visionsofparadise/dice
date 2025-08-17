import { Message } from "..";

export const mockMessage = (properties?: Partial<Message.Properties>) =>
	new Message({
		body: {
			type: "noop",
		},
		...properties,
	});
