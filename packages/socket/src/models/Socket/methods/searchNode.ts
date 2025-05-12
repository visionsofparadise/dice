import { base58 } from "@scure/base";
import { shuffle } from "@technically/lodash";
import { Socket } from "..";
import { PublicKeyCodec } from "../../Keys/Codec";
import { Node } from "../../Node/Codec";

export const searchSocketNodes = async (socket: Socket, count: number, filter: (node: Node) => boolean, isAddingNodes = true): Promise<Array<Node>> => {
	const resultPublicKeys: Set<string> = new Set();
	const resultNodes: Array<Node> = [];

	for (const node of socket.overlay.table) {
		if (filter(node) && resultNodes.length < count) {
			const key = base58.encode(node.publicKey);

			if (!resultPublicKeys.has(key)) {
				resultPublicKeys.add(key);
				resultNodes.push(node);
			}
		}

		if (resultNodes.length >= count) return resultNodes;
	}

	for (const node of socket.options.bootstrapNodes) {
		if (filter(node) && resultNodes.length < count) {
			const key = base58.encode(node.publicKey);

			if (!resultPublicKeys.has(key)) {
				resultPublicKeys.add(key);
				resultNodes.push(node);
			}
		}

		if (resultNodes.length >= count) return resultNodes;
	}

	const initialNodes = socket.overlay.sample(socket.options.concurrency, () => true);

	if (initialNodes.length < socket.options.concurrency) {
		const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

		while (initialNodes.length < socket.options.concurrency) {
			const node = bootstrapNodes.pop();

			if (!node) break;

			initialNodes.push(node);
		}
	}

	await Promise.any(
		initialNodes.map(async (initialNode) => {
			const randomPublicKey = crypto.getRandomValues(new Uint8Array(PublicKeyCodec.byteLength()));

			for await (const nodes of socket.iterateNodes(randomPublicKey, initialNode, isAddingNodes)) {
				for (const node of nodes) {
					if (filter(node) && resultNodes.length < count) {
						const key = base58.encode(initialNode.publicKey);

						if (!resultPublicKeys.has(key)) {
							resultPublicKeys.add(key);
							resultNodes.push(node);
						}
					}

					if (resultNodes.length >= count) break;
				}

				if (resultNodes.length >= count) break;
			}
		})
	);

	return resultNodes;
};
