import { sampleSize } from "@technically/lodash";
import { Overlay } from "..";
import { Address } from "../../Address";

export const findOverlayAddresses = async (overlay: Overlay, count: number, excludedPrefixes = new Set<string>()): Promise<Array<Address>> => {
	if (count === 0) return [];

	const resultAddresses: Array<{ address: Address; pingMs: number }> = [];

	let initialAddresses = sampleSize(overlay.coordinators, overlay.options.concurrency);

	if (initialAddresses.length < overlay.options.concurrency) {
		initialAddresses = initialAddresses.concat(sampleSize(overlay.candidates, overlay.options.concurrency - initialAddresses.length));
	}

	if (initialAddresses.length < overlay.options.concurrency) {
		initialAddresses = initialAddresses.concat(sampleSize(overlay.options.bootstrapAddresses, overlay.options.concurrency - initialAddresses.length));
	}

	await Promise.allSettled(
		initialAddresses.map(async (initialAddress) => {
			let current = {
				address: initialAddress,
				pingMs: Infinity,
			};
			let depth = 0;

			while (current.address && depth++ < overlay.options.depth.maximum) {
				if (!overlay.options.isPrefixFilteringDisabled) {
					excludedPrefixes.add(current.address.prefix);
				}

				const nextAddresses = await overlay.list(current.address);
				const pingedAt = Date.now();
				const promises: Array<Promise<{ address: Address; pingMs: number }>> = [];

				for (const address of nextAddresses) {
					if ((!overlay.options.isPrefixFilteringDisabled && excludedPrefixes.has(address.prefix)) || !overlay.isValidAddress(address) || overlay.coordinatorMap.has(address.key)) {
						continue;
					}

					if (!overlay.options.isPrefixFilteringDisabled) {
						excludedPrefixes.add(address.prefix);
					}

					promises.push(
						(async () => {
							await overlay.ping(address);

							const pingMs = Date.now() - pingedAt;

							resultAddresses.push({ address, pingMs });

							return { address, pingMs };
						})()
					);
				}

				const next = await Promise.any(promises);

				if (depth >= overlay.options.depth.minimum && next.pingMs >= current.pingMs) break;

				current = next;
			}
		})
	);

	return resultAddresses
		.sort((valueA, valueB) => valueA.pingMs - valueB.pingMs)
		.slice(0, count)
		.map((value) => value.address);
};
