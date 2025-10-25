import ipaddr from "ipaddr.js";
import { Overlay } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";

export interface SendOverlayOptions {
	retryCount?: number;
	signal?: AbortSignal;
}

export const sendOverlay = async (overlay: Overlay, address: Address, buffer: Uint8Array, options?: SendOverlayOptions): Promise<void> => {
	overlay.logger?.debug(`Sending ${buffer.byteLength} bytes via ${address.toString()}`);

	let attempts = 0;
	let anySuccess = false;
	const retryCount = options?.retryCount || 3;

	while (attempts < retryCount && !options?.signal?.aborted) {
		try {
			await new Promise<void>((resolve, reject) =>
				overlay.socket.send(buffer, address.port, ipaddr.fromByteArray([...address.ip.values()]).toString(), (error, byteLength) => {
					if (error) {
						return reject(error);
					}

					overlay.logger?.debug(`Sent ${byteLength} bytes`);

					if (overlay.external) overlay.cache.bindOut.add(overlay.external.key, address.key);

					resolve();
				})
			);

			anySuccess = true;
		} catch (error) {
			overlay.events.emit("error", error);
		}

		attempts++;

		// Wait before next attempt (unless this was the last attempt or we're aborting)
		if (attempts < retryCount && !options?.signal?.aborted) {
			await new Promise<void>((resolve) => {
				const delay = 250 * 2 ** (attempts - 1);

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
