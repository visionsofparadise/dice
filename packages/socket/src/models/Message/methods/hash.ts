import { Codec } from "bufferfy";
import { Message } from "..";
import { createHash } from "../../../utilities/Hash";
import { MessagePropertiesCodec } from "../Codec";

export const hashMessage = (properties: Omit<Message.Properties, "signature">) => {
	return createHash(Codec.Omit(MessagePropertiesCodec, ["signature"]).encode(properties));
};
