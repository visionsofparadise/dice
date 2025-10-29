import ipaddr from "ipaddr.js";
import { Layer } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";
import { Envelope } from "../../Envelope";

export interface SendOverlayOptions {
	retryCount?: number;
	signal?: AbortSignal;  // When signal is aborted, pending retries are cancelled
}

export const sendOverlay = async (layer: Layer, address: Address, buffer: Uint8Array, options?: SendOverlayOptions): Promise<void> => {
	if (layer.state !== Layer.STATE.OPENED) {
		throw new DiceError("Cannot send: layer is not opened");
	}

	// Wrap payload in Envelope
	// Include reflection if this is a response (we have inbound binding)
	const hasInboundBinding = layer.external && layer.bindings.hasInboundBinding(address.key, layer.external.key);
	const envelope = new Envelope({
		payload: buffer,
		reflectionAddress: hasInboundBinding ? address : undefined,
	});

	const envelopeBuffer = envelope.buffer;

	layer.logger?.debug(`Sending ${envelopeBuffer.byteLength} bytes (${buffer.byteLength} payload) via ${address.toString()}`);

	let attempts = 0;
	let anySuccess = false;
	const retryCount = options?.retryCount || 3;

	while (attempts < retryCount && !options?.signal?.aborted) {
		try {
			await new Promise<void>((resolve, reject) =>
				layer.socket.send(envelopeBuffer, address.port, ipaddr.fromByteArray([...address.ip.values()]).toString(), (error, byteLength) => {
					if (error) {
						return reject(error);
					}

					layer.logger?.debug(`Sent ${byteLength} bytes`);

					if (layer.external) layer.bindings.establishOutboundBinding(layer.external.key, address.key);

					resolve();
				})
			);

			anySuccess = true;
		} catch (error) {
			layer.events.emit("error", error);
		}

		attempts++;

		// Wait before next attempt (unless this was the last attempt or we're aborting)
		// Fixed delay instead of exponential - retries are for UDP packet loss, not congestion
		if (attempts < retryCount && !options?.signal?.aborted) {
			await new Promise<void>((resolve) => {
				const delay = 100;

				if (options?.signal) {
					const abortListener = () => {
						options.signal?.removeEventListener("abort", abortListener);
						resolve();
					};

					options.signal.addEventListener("abort", abortListener);

					setTimeout(() => {
						options.signal?.removeEventListener("abort", abortListener);
						resolve();
					}, delay);
				} else {
					setTimeout(resolve, delay);
				}
			});
		}
	}

	if (!anySuccess) {
		throw new DiceError("Sending failed");
	}
};
