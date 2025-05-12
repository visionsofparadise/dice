import { shuffle } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { Socket } from "..";
import { PublicKeyCodec } from "../../Keys/Codec";
import { Node } from "../../Node/Codec";

export const findSocketNodes = async (socket: Socket, publicKey: Uint8Array): Promise<Array<Node>> => {
	const byteLength = PublicKeyCodec.byteLength();
	const initialNodes = socket.overlay.table.listClosestToId(publicKey, socket.options.concurrency);

	if (initialNodes.length < socket.options.concurrency) {
		const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

		while (initialNodes.length < socket.options.concurrency) {
			const node = bootstrapNodes.pop();

			if (!node) break;

			initialNodes.push(node);
		}
	}

	const results = await Promise.allSettled(
		initialNodes.map(async (initialNode) => {
			let nodes: Array<Node> = [initialNode];

			for await (const nextNodes of socket.iterateNodes(publicKey, initialNode)) nodes = nextNodes;

			return nodes;
		})
	);

	return results
		.reduce<Array<Node>>((previous, result) => {
			if (result.status === "rejected") return previous;

			return previous.concat(result.value);
		}, [])
		.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.publicKey, publicKey, byteLength) - getBitwiseDistance(nodeB.publicKey, publicKey, byteLength))
		.slice(0, 20);
};
