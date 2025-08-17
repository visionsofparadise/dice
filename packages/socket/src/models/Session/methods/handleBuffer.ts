import { Session } from "..";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { MessageCodec } from "../../Message/Codec";

export const handleSessionBuffer = async (session: Session, buffer: Uint8Array, context: RequiredProperties<Session.Context, "remoteInfo">) => {
	try {
		session.logger?.debug(`Recevied ${buffer.byteLength} bytes`);

		const remoteAddress = Address.fromRemoteInfo(context.remoteInfo);
		const message = MessageCodec.decode(buffer);

		session.events.emit("message", message, {
			...context,
			buffer,
			remoteAddress,
			session,
		});
	} catch (error) {
		session.events.emit("error", error);
	}
};
