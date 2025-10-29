import { Layer } from "..";

export const healthcheckOverlay = async (layer: Layer): Promise<void> => {
	if (layer.isHealthchecking) return;
	layer.isHealthchecking = true;  // Set immediately to prevent concurrent execution

	try {
		layer.logger?.debug("Healthchecking");

		await layer.healthcheckCoordinators();
	} catch (error) {
		layer.events.emit("error", error);
	} finally {
		layer.logger?.debug("Healthchecking complete");
		layer.isHealthchecking = false;
	}
};
