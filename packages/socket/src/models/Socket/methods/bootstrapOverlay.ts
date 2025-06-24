import { Socket } from "..";

export const bootstrapSocketOverlay = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isBootstrappingOverlay) return;

		socket.isBootstrappingOverlay = true;
		socket.logger?.debug("Bootstrapping overlay");

		const initialNodes = socket.overlay.sample(socket.options.concurrency);

		await Promise.allSettled(
			initialNodes.map(async (initialNode) => {
				for await (const _ of socket.iterateNodes(socket.keys.diceAddress, initialNode)) {
				}
			})
		);
	} finally {
		socket.logger?.debug("Bootstrapping overlay complete");
		socket.isBootstrappingOverlay = false;
	}
};
