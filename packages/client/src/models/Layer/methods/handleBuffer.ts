import { compare } from "uint8array-tools";
import { Layer } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { EnvelopeCodec, VERSION as ENVELOPE_VERSION } from "../../Envelope/Codec";
import { handleOverlayEnvelope } from "./handleEnvelope";

export const handleOverlayBuffer = async (layer: Layer, buffer: Uint8Array, context: RequiredProperties<Layer.Context, "remoteInfo">) => {
	try {
		if (layer.state !== Layer.STATE.OPENED) return;

		// Emit raw buffer event
		layer.events.emit("buffer", buffer, context.remoteInfo);

		// Check for Envelope magic bytes
		if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

		const version = buffer.at(MAGIC_BYTES.byteLength);

		if (version === undefined || version > ENVELOPE_VERSION.V1) return;

		layer.logger?.debug(`Received ${buffer.byteLength} bytes`);

		const remoteAddress = Address.fromAddressInfo(context.remoteInfo);

		if (remoteAddress.type !== layer.local.type) return;

		// Parse Envelope
		const envelope = EnvelopeCodec.decode(buffer);

		// Emit envelope event
		layer.events.emit("envelope", envelope, {
			buffer,
			layer,
			remoteInfo: context.remoteInfo,
			remoteAddress,
		});

		// Handle envelope (routes to message/diceMessage)
		await handleOverlayEnvelope(layer, envelope, {
			buffer,
			layer,
			remoteInfo: context.remoteInfo,
			remoteAddress,
		});
	} catch (error) {
		layer.events.emit("error", error);
	}
};
