import { Client } from "..";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { MessageBodyCodec } from "../../Message/BodyCodec";
import { MessageCodec } from "../../Message/Codec";

export const handleClientBuffer = async (client: Client, buffer: Uint8Array, context: RequiredProperties<Client.Context, "remoteInfo">) => {
	try {
		if (buffer[0] === undefined || buffer[0] >= MessageBodyCodec.codecs.length) return;

		client.logger?.debug(`Recevied ${buffer.byteLength} bytes`);

		const remoteAddress = Address.fromRemoteInfo(context.remoteInfo);
		const message = MessageCodec.decode(buffer);

		client.events.emit("message", message, {
			...context,
			buffer,
			remoteAddress,
			session: client,
		});
	} catch (error) {
		client.events.emit("error", error);
	}
};
