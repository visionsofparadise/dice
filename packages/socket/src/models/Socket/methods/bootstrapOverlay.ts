import { shuffle } from "@technically/lodash";
import { Socket } from "..";
import { PublicKeyCodec } from "../../Keys/Codec";

export const bootstrapSocketOverlay = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isBootstrappingOverlay) return;

		socket.isBootstrappingOverlay = true;

		socket.logger?.info("Bootstrapping overlay");

		const randomInitialPublicKey = crypto.getRandomValues(new Uint8Array(PublicKeyCodec.byteLength()));

		const initialNodes = socket.overlay.table.listClosestToId(randomInitialPublicKey, socket.options.concurrency);

		if (initialNodes.length < socket.options.concurrency) {
			const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

			while (initialNodes.length < socket.options.concurrency) {
				const node = bootstrapNodes.pop();

				if (!node) break;

				initialNodes.push(node);
			}
		}

		await Promise.allSettled(
			initialNodes.map(async (initialNode) => {
				for await (const _ of socket.iterateNodes(socket.keys.publicKey, initialNode)) {
				}
			})
		);
	} catch (error) {
		socket.emit("error", error);

		throw error;
	} finally {
		socket.isBootstrappingOverlay = false;
	}
};
