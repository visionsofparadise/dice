import { shuffle } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { Socket } from "..";
import { DiceAddressCodec } from "../../Keys/Codec";
import { Node } from "../../Node";

export const searchSocketNode = async (socket: Socket, filter?: (node: Node) => boolean): Promise<Node | undefined> => {
	const randomDiceAddress = crypto.getRandomValues(new Uint8Array(DiceAddressCodec.byteLength()));

	const initialNodes = socket.overlay.table
		.listClosestToId(randomDiceAddress)
		.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.diceAddress, randomDiceAddress) - getBitwiseDistance(nodeB.diceAddress, randomDiceAddress))
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
				for await (const nodes of socket.iterateNodes(randomDiceAddress, initialNode)) {
					if (isResolved) break;

					for (const node of nodes) if (!filter || filter(node)) return node;
				}

				throw new Error("Node not found");
			})
		);

		return node;
	} catch (error) {
		return undefined;
	}
};
