import { Message } from "..";
import { MessageBodyType } from "../BodyCodec";

export const mockMessage = (properties?: Partial<Message.Properties>) =>
	new Message({
		body: {
			type: MessageBodyType.NOOP,
		},
		...properties,
	});
