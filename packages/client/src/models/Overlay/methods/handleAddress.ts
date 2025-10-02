import { Overlay } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";

export const handleOverlayAddress = (overlay: Overlay, address: Address, message?: Message) => {
	if (overlay.external && !overlay.cache.bindOut.has(overlay.external.key, address.key)) {
		const now = Date.now();

		const isChanging = now - overlay.lastUnsolicitedAt > 60_000;

		overlay.lastUnsolicitedAt = now;

		if (isChanging) overlay.events.emit("address", overlay.external, !overlay.isReachable ? overlay.coordinators : undefined);
	}

	if (overlay.external) {
		overlay.cache.bindIn.add(address.key, overlay.external.key);
	}

	if (message) {
		if (message.flags.isNotCandidate) {
			if (overlay.candidateMap.has(address.key)) {
				overlay.candidateMap.delete(address.key);

				return;
			}
		} else {
			if (overlay.isValidAddress(address) && !overlay.candidateMap.has(address.key) && !overlay.coordinatorMap.has(address.key)) {
				if (overlay.candidateMap.size >= overlay.options.candidateCount) {
					for (const key of overlay.candidateMap.keys()) {
						overlay.candidateMap.delete(key);
						overlay.candidateMap.set(address.key, address);

						break;
					}
				} else {
					overlay.candidateMap.set(address.key, address);
				}
			}
		}
	}
};
