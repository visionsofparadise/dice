import { Overlay } from "..";
import { Address } from "../../Address";

export const handleOverlayReflection = (overlay: Overlay, remoteAddress: Address, reflectionAddress: Address) => {
	if (overlay.reflection.has(remoteAddress.prefix)) return;

	if (overlay.reflection.size >= 2) {
		for (const key of overlay.reflection.keys()) {
			overlay.reflection.delete(key);
			overlay.reflection.set(remoteAddress.prefix, reflectionAddress);

			break;
		}
	} else {
		overlay.reflection.set(remoteAddress.prefix, reflectionAddress);
	}

	const [addressA, addressB] = [...overlay.reflection.values()];

	if (!addressA || !addressB) return;

	if (overlay.external && (overlay.external.key === addressA.key || overlay.external.key === addressB.key)) return;

	if (addressA.key === addressB.key) {
		overlay.external = addressA;
	}

	if (addressA.key !== addressB.key) {
		overlay.external = undefined;
	}

	overlay.events.emit("address", overlay.external, !overlay.isReachable ? overlay.coordinators : undefined);
};
