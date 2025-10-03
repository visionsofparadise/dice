import ipaddr from "ipaddr.js";
import { Overlay } from "..";
import { Address } from "../../Address";

export interface SendOverlayOptions {
	retryCount?: number;
	signal?: AbortSignal;
}

export const sendOverlay = async (overlay: Overlay, address: Address, buffer: Uint8Array, options?: SendOverlayOptions): Promise<void> => {
	overlay.logger?.debug(`Sending ${buffer.byteLength} bytes via ${address.toString()}`);

	if (address.key === overlay.external?.key) {
		setImmediate(() => {
			overlay.handleBuffer(buffer, {
				buffer,
				overlay: overlay,
				remoteAddress: overlay.external,
				remoteInfo: overlay.external!.toRemoteInfo(buffer.byteLength),
			});
		});

		return;
	}
	let attempts = 0;

	while (attempts++ < (options?.retryCount || 3) && !options?.signal?.aborted) {
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
		} catch (error) {
			overlay.events.emit("error", error);
		}

		if (!options?.signal) break;

		await new Promise<void>((resolve) => {
			const listener = () => {
				options.signal?.removeEventListener("abort", listener);
				resolve();
			};

			options.signal?.addEventListener("abort", listener);

			setTimeout(() => resolve(), 250 * 2 ** attempts);
		});
	}
};
