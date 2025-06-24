import { shuffle } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { Socket } from "..";
import { Keys } from "../../Keys";
import { Node } from "../../Node";

export const findSocketNodes = async (socket: Socket, diceAddress: Uint8Array): Promise<Array<Node>> => {
	const nDiceAddress = Keys.normalizeAddress(diceAddress);

	let initialNodes = socket.overlay.table
		.listClosestToId(nDiceAddress)
		.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.diceAddress, nDiceAddress) - getBitwiseDistance(nodeB.diceAddress, nDiceAddress))
		.slice(0, socket.options.concurrency);

	if (initialNodes.length < socket.options.concurrency) {
		const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

		initialNodes = initialNodes.concat(bootstrapNodes.slice(0, socket.options.concurrency - initialNodes.length));
	}

	const results = await Promise.allSettled(
		initialNodes.map(async (initialNode) => {
			let nodes: Array<Node> = [initialNode];

			for await (const nextNodes of socket.iterateNodes(nDiceAddress, initialNode)) nodes = nextNodes;

			return nodes;
		})
	);

	return results
		.reduce<Array<Node>>((previous, result) => {
			if (result.status === "rejected") return previous;

			return previous.concat(result.value);
		}, [])
		.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.diceAddress, nDiceAddress) - getBitwiseDistance(nodeB.diceAddress, nDiceAddress))
		.slice(0, 20);
};
