import { sampleSize } from "@technically/lodash";
import { Client } from "..";
import { Address } from "../../Address";

export const findClientAddresses = async (client: Client, count: number, excludedPrefixes = new Set<string>()): Promise<Array<Address>> => {
	if (count === 0) return [];

	const resultAddresses: Array<{ address: Address; pingMs: number }> = [];

	let initialAddresses = sampleSize(client.endpoint.relayAddresses, client.options.concurrency);

	if (initialAddresses.length < client.options.concurrency) {
		initialAddresses = initialAddresses.concat(sampleSize(client.options.bootstrapAddresses, client.options.concurrency - initialAddresses.length));
	}

	await Promise.allSettled(
		initialAddresses.map(async (initialAddress) => {
			let current = {
				address: initialAddress,
				pingMs: Infinity,
			};
			let depth = 0;

			while (current.address && depth++ < client.options.depth.maximum) {
				excludedPrefixes.add(current.address.prefix);

				const nextAddresses = await client.list(current.address);
				const pingedAt = Date.now();
				const promises: Array<Promise<{ address: Address; pingMs: number }>> = [];

				for (const address of nextAddresses) {
					if (excludedPrefixes.has(address.prefix) || !client.isValidAddress(address)) {
						continue;
					}

					promises.push(
						(async () => {
							excludedPrefixes.add(address.prefix);

							await client.ping(address);

							const pingMs = Date.now() - pingedAt;

							resultAddresses.push({ address, pingMs });

							return { address, pingMs };
						})()
					);
				}

				const next = await Promise.any(promises);

				if (depth >= client.options.depth.minimum && next.pingMs >= current.pingMs) break;

				current = next;
			}
		})
	);

	return resultAddresses
		.sort((valueA, valueB) => valueA.pingMs - valueB.pingMs)
		.slice(0, count)
		.map((value) => value.address);
};
