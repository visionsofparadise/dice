import { shuffle } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { Keys } from "../../Keys";
import { Node } from "../../Node";

export const findSocketNode = async (socket: Socket, diceAddress: Uint8Array): Promise<Node | undefined> => {
	const nDiceAddress = Keys.normalizeAddress(diceAddress);

	const overlayTableNode = socket.overlay.table.peekById(nDiceAddress);

	if (overlayTableNode) return overlayTableNode;

	const initialNodes = socket.overlay.table
		.listClosestToId(nDiceAddress)
		.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.diceAddress, nDiceAddress) - getBitwiseDistance(nodeB.diceAddress, nDiceAddress))
		.slice(0, socket.options.concurrency);

	if (initialNodes.length < socket.options.concurrency) {
		const bootstrapNodes = shuffle(socket.options.bootstrapNodes);

		while (initialNodes.length < socket.options.concurrency) {
			const node = bootstrapNodes.pop();

			if (!node) break;

			initialNodes.push(node);
		}
	}

	let isResolved = false;

	try {
		const node = await Promise.any(
			initialNodes.map(async (initialNode) => {
				for await (const nodes of socket.iterateNodes(nDiceAddress, initialNode)) {
					if (isResolved) break;

					const node = nodes.at(0);

					if (node && compare(node.diceAddress, nDiceAddress) === 0) {
						isResolved = true;

						return node;
					}
				}

				throw new Error("Node not found");
			})
		);

		return node;
	} catch (error) {
		return undefined;
	}
};
