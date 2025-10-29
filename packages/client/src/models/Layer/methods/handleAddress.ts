import { Layer } from "..";
import { Address } from "../../Address";

export const handleOverlayAddress = (layer: Layer, address: Address) => {
	if (layer.external && !layer.bindings.hasOutboundBinding(layer.external.key, address.key)) {
		const now = Date.now();
		const wasPublic = layer.isPublic;

		layer.lastUnsolicitedAt = now;

		const isPublicNow = layer.isPublic;

		// Emit address event on public status transition
		if (wasPublic !== isPublicNow) {
			layer.events.emit("address", layer.external, !isPublicNow ? layer.coordinators.getAll() : undefined);
		}
	}

	if (layer.external) {
		layer.bindings.establishInboundBinding(address.key, layer.external.key);
	}

	// Direct coordinator testing: add peers from application traffic
	// If we received from a peer without existing binding, pool not full, and peer is valid
	const isExcluded = layer.options.excludeFromCoordinators?.has(address.key);
	const isCoordinator = layer.coordinators.has(address.key);
	const poolNotFull = layer.coordinators.size < layer.options.coordinatorCount;
	const noExistingBinding = layer.external && !layer.bindings.hasOutboundBinding(layer.external.key, address.key);

	if (!isExcluded && !isCoordinator && poolNotFull && noExistingBinding && layer.isValidAddress(address)) {
		// Test reachability and add to coordinators if successful
		layer.ping(address).then(() => {
			if (layer.coordinators.size < layer.options.coordinatorCount) {
				layer.coordinators.add(address);
				layer.events.emit("address", layer.external, !layer.isReachable ? layer.coordinators.getAll() : undefined);
			}
		}).catch(() => {
			// Peer not reachable, don't add
		});
	}
};
