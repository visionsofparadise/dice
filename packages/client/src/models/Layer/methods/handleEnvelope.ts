import { compare } from "uint8array-tools";
import { Layer } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Envelope } from "../../Envelope";
import { MessageCodec, VERSION } from "../../Message/Codec";
import { handleOverlayReflection } from "./handleReflection";

export const handleOverlayEnvelope = async (
	layer: Layer,
	envelope: Envelope,
	context: RequiredProperties<Layer.Context, "buffer" | "layer" | "remoteInfo" | "remoteAddress">
) => {
	try {
		if (layer.state !== Layer.STATE.OPENED) return;

		const contextWithEnvelope: Layer.Context = { ...context, envelope };

		// Check if payload contains DICE magic bytes
		const hasMagicBytes = compare(envelope.payload.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) === 0;

		if (hasMagicBytes) {
			// DICE control message
			const version = envelope.payload.at(MAGIC_BYTES.byteLength);

			if (version === undefined || version > VERSION.V0) return;

			layer.logger?.debug(`Received DICE message ${envelope.payload.byteLength} bytes`);

			const message = MessageCodec.decode(envelope.payload);

			// Apply optional message filter for rate limiting / security
			if (layer.options.filterMessage && !layer.options.filterMessage(message, context.remoteAddress)) {
				layer.logger?.debug(`Message filtered from ${context.remoteAddress.toString()}`);
				return;
			}

			layer.events.emit("diceMessage", message, contextWithEnvelope);
		} else {
			// Application payload
			layer.logger?.debug(`Received application payload ${envelope.payload.byteLength} bytes`);
			layer.events.emit("message", envelope.payload, contextWithEnvelope);
		}

		// Handle reflection if present
		if (envelope.reflectionAddress) {
			handleOverlayReflection(layer, context.remoteAddress, envelope.reflectionAddress);
		}
	} catch (error) {
		layer.events.emit("error", error);
	}
};
