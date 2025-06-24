import { Socket } from "..";

export const healthcheckSocketOverlay = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isHealthcheckingOverlay) return;

		socket.isHealthcheckingOverlay = true;
		socket.logger?.debug("Healthchecking overlay");

		await Promise.allSettled(
			[...socket.overlay.table].map(async (node) => {
				try {
					await socket.ping(node);
				} catch (error) {
					socket.overlay.remove(node);
				}
			})
		);

		if (!socket.overlay.table.length) await socket.bootstrapOverlay();
	} catch (error) {
		socket.emit("error", error);
	} finally {
		socket.logger?.debug("Healthchecking overlay complete");
		socket.isHealthcheckingOverlay = false;
	}
};
