import { compare } from "uint8array-tools";
import { Overlay } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { MessageCodec, VERSION } from "../../Message/Codec";

export const handleOverlayBuffer = async (overlay: Overlay, buffer: Uint8Array, context: RequiredProperties<Overlay.Context, "remoteInfo">) => {
	try {
		if (overlay.state !== Overlay.STATE.OPENED) return;

		if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

		const version = buffer.at(MAGIC_BYTES.byteLength);

		if (version === undefined || version > VERSION.V0) return;

		overlay.logger?.debug(`Recevied ${buffer.byteLength} bytes`);

		const remoteAddress = Address.fromAddressInfo(context.remoteInfo);

		if (remoteAddress.type !== overlay.local.type) return;

		const message = MessageCodec.decode(buffer);

		overlay.events.emit("message", message, {
			...context,
			buffer,
			overlay: overlay,
			remoteAddress,
		});
	} catch (error) {
		overlay.events.emit("error", error);
	}
};
