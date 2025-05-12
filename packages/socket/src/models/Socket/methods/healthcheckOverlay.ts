import { Socket } from "..";

export const healthcheckSocketOverlay = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isHealthcheckingOverlay) return;

		socket.isHealthcheckingOverlay = true;

		const promises: Array<Promise<any>> = [];

		for (const node of socket.overlay.table) {
			promises.push(
				(async () => {
					if (socket.cache.health.has(socket.createCacheKey(node.address))) return;

					try {
						const response = await socket.ping(node);

						await socket.processNode(response.sourceNode);
					} catch (error) {
						socket.overlay.remove(node);
					}
				})()
			);
		}

		if (promises.length) await Promise.allSettled(promises);

		if (!socket.overlay.table.length) await socket.bootstrapOverlay();
	} catch (error) {
		socket.emit("error", error);

		throw error;
	} finally {
		socket.isHealthcheckingOverlay = false;
	}
};
