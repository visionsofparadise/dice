import { Layer } from "..";
import { Address } from "../../Address";
import { isValidPublicAddress } from "../../../utilities/isValidPublicAddress";

export const handleOverlayReflection = (layer: Layer, remoteAddress: Address, reflectionAddress: Address) => {
	// Validate reflection address is a public, routable address
	if (!layer.options.isAddressValidationDisabled && !isValidPublicAddress(reflectionAddress)) {
		layer.logger?.debug(`Rejected reflection from ${remoteAddress.toString()}: ${reflectionAddress.toString()} is not a valid public address`);
		return;
	}

	if (layer.reflection.has(remoteAddress.prefix)) return;

	if (layer.reflection.size >= 2) {
		for (const key of layer.reflection.keys()) {
			layer.reflection.delete(key);
			layer.reflection.set(remoteAddress.prefix, reflectionAddress);

			break;
		}
	} else {
		layer.reflection.set(remoteAddress.prefix, reflectionAddress);
	}

	const [addressA, addressB] = [...layer.reflection.values()];

	if (!addressA || !addressB) return;

	if (layer.external && (layer.external.key === addressA.key || layer.external.key === addressB.key)) return;

	if (addressA.key === addressB.key) {
		layer.external = addressA;
	}

	if (addressA.key !== addressB.key) {
		layer.external = undefined;
	}

	layer.events.emit("address", layer.external, !layer.isReachable ? layer.coordinators.getAll() : undefined);
};
