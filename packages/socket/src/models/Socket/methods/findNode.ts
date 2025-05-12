import { shuffle } from "@technically/lodash";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { Node } from "../../Node/Codec";

export const findSocketNode = async (socket: Socket, publicKey: Uint8Array): Promise<Node | undefined> => {
	const overlayTableNode = socket.overlay.table.peekById(publicKey);

	if (overlayTableNode) return overlayTableNode;

	let isResolved = false;

	const initialNodes = socket.overlay.table.listClosestToId(publicKey, socket.options.concurrency);

	if (initialNodes.length < socket.options.concurrency) {
		const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

		while (initialNodes.length < socket.options.concurrency) {
			const node = bootstrapNodes.pop();

			if (!node) break;

			initialNodes.push(node);
		}
	}

	return Promise.any(
		initialNodes.map(async (initialNode) => {
			if (compare(initialNode.publicKey, publicKey) === 0) {
				isResolved = true;

				return initialNode;
			}

			for await (const nodes of socket.iterateNodes(publicKey, initialNode)) {
				if (isResolved) break;

				const node = nodes.at(0);

				if (node && compare(node.publicKey, publicKey) === 0) {
					isResolved = true;

					return node;
				}
			}

			throw new Error("Not found");
		})
	);
};
