import { Layer } from "..";
import { Address } from "../../Address";

export const healthcheckOverlayCoordinators = async (layer: Layer): Promise<void> => {
	const coordinatorMap = new Map<string, Address>(layer.coordinators.getMap());

	const promises = layer.coordinators.getAll().map(async (address) => {
		if (!layer.external || !layer.bindings.hasInboundBinding(address.key, layer.external.key)) {
			try {
				await layer.ping(address);
			} catch (error) {
				coordinatorMap.delete(address.key);
			}
		}
	});

	if (promises.length) await Promise.allSettled(promises);

	const hadCoordinators = layer.coordinators.size > 0;

	layer.coordinators.replaceAll(coordinatorMap, layer.options.coordinatorCount);

	// Emit coordinatorPoolDepleted if we have no coordinators left
	if (hadCoordinators && layer.coordinators.size === 0) {
		layer.events.emit("coordinatorPoolDepleted");
	}

	// Emit address event if coordinator list changed
	if (coordinatorMap.size !== layer.coordinators.size) {
		layer.events.emit("address", layer.external, !layer.isReachable ? layer.coordinators.getAll() : undefined);
	}
};
