import { compare } from "uint8array-tools";
import { Client } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { MessageCodec, VERSION } from "../../Message/Codec";

export const handleClientBuffer = async (client: Client, buffer: Uint8Array, context: RequiredProperties<Client.Context, "remoteInfo">) => {
	try {
		if (client.state !== Client.STATE.OPENED) return;

		if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

		const version = buffer.at(MAGIC_BYTES.byteLength);

		if (version === undefined || version > VERSION.V0) return;

		client.logger?.debug(`Recevied ${buffer.byteLength} bytes`);

		const remoteAddress = Address.fromRemoteInfo(context.remoteInfo);
		const message = MessageCodec.decode(buffer);

		client.events.emit("message", message, {
			...context,
			buffer,
			client,
			remoteAddress,
		});
	} catch (error) {
		client.events.emit("error", error);
	}
};
