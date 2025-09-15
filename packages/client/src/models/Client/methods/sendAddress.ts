import ipaddr from "ipaddr.js";
import { Client } from "..";
import { Address } from "../../Address";

export interface SendClientAddressOptions {
	retryCount?: number;
	signal?: AbortSignal;
}

export const sendClientAddress = async (client: Client, address: Address, buffer: Uint8Array, options?: SendClientAddressOptions): Promise<void> => {
	client.logger?.debug(`Sending ${buffer.byteLength} bytes via ${address.toString()}`);

	if (address.key === client.endpoint.address?.key) {
		await client.handleBuffer(buffer, {
			buffer,
			remoteAddress: client.endpoint.address,
			remoteInfo: client.endpoint.address.toRemoteInfo(buffer.byteLength),
			session: client,
		});

		return;
	}
	let attempts = 0;

	while (attempts++ < (options?.retryCount || 3) && !options?.signal?.aborted) {
		try {
			await new Promise<void>((resolve, reject) =>
				client.socket.send(buffer, address.port, ipaddr.fromByteArray([...address.ip.address.values()]).toString(), (error, byteLength) => {
					if (error) {
						return reject(error);
					}

					client.logger?.debug(`Sent ${byteLength} bytes`);

					resolve();
				})
			);
		} catch (error) {
			client.events.emit("error", error);
		}

		if (!options?.signal) break;

		await new Promise<void>((resolve) => {
			const listener = () => {
				options.signal?.removeEventListener("abort", listener);
				resolve();
			};

			options.signal?.addEventListener("abort", listener);

			setTimeout(() => resolve(), 100 * 2 ** attempts);
		});
	}
};
