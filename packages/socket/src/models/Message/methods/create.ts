import { Message } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Keys } from "../../Keys";
import { MessageBodyType } from "../BodyCodec";

export const createMessage = <T extends MessageBodyType = MessageBodyType>(properties: RequiredProperties<Message.Properties<T>, "node" | "body">, keys: Keys): Message<T> => {
	const defaultProperties: Omit<Message.Properties<T>, "signature"> = {
		magicBytes: MAGIC_BYTES,
		node: properties.node,
		body: properties.body,
	};

	const hash = Message.hash(defaultProperties);

	const signature = keys.sign(hash);

	const message = new Message<T>(
		{
			...defaultProperties,
			signature,
		},
		{
			hash,
		}
	);

	return message;
};
