import { Overlay } from "..";

export const healthcheckOverlay = async (overlay: Overlay): Promise<void> => {
	try {
		if (overlay.isHealthchecking) return;

		overlay.isHealthchecking = true;
		overlay.logger?.debug("Healthchecking");

		await Promise.all([overlay.healthcheckCandidates(), overlay.healthcheckCoordinators()]);
	} catch (error) {
		overlay.events.emit("error", error);
	} finally {
		overlay.logger?.debug("Healthchecking complete");
		overlay.isHealthchecking = false;
	}
};
