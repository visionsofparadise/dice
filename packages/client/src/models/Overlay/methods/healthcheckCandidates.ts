import { Overlay } from "..";
import { Address } from "../../Address";

export const healthcheckOverlayCandidates = async (overlay: Overlay): Promise<void> => {
	const candidateMap = new Map<string, Address>(overlay.candidateMap);

	const promises = overlay.candidates.map(async (address) => {
		if (!overlay.external || !overlay.cache.bindIn.has(address.key, overlay.external.key)) {
			try {
				await overlay.ping(address);
			} catch (error) {
				candidateMap.delete(address.key);
			}
		}
	});

	if (promises.length) await Promise.allSettled(promises);

	overlay.candidateMap = new Map([...candidateMap]);
};
