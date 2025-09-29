import { Overlay } from "..";
import { Address } from "../../Address";

export const healthcheckOverlayCoordinators = async (overlay: Overlay): Promise<void> => {
	const coordinatorMap = new Map<string, Address>(overlay.coordinatorMap);

	const promises = overlay.coordinators.map(async (address) => {
		if (!overlay.external || !overlay.cache.bindIn.has(address.key, overlay.external.key)) {
			try {
				await overlay.ping(address);
			} catch (error) {
				coordinatorMap.delete(address.key);
			}
		}
	});

	if (promises.length) await Promise.allSettled(promises);

	const newAddresses = await overlay.findAddresses(overlay.options.coordinatorCount - coordinatorMap.size);

	for (const newAddress of newAddresses) coordinatorMap.set(newAddress.key, newAddress);

	overlay.coordinatorMap = new Map([...coordinatorMap].slice(0, overlay.options.coordinatorCount));

	if (newAddresses.length) overlay.events.emit("address", overlay.external, !overlay.isReachable ? overlay.coordinators : undefined);
};
