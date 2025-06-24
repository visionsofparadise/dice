import { base32crockford, hex } from "@scure/base";
import { uniqBy } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { Keys } from "../../Keys";
import { Node } from "../../Node";

export async function* iterateSocketNodes(socket: Socket, diceAddress: Uint8Array, initialNode: Node): AsyncIterableIterator<Array<Node>> {
	const nDiceAddress = Keys.normalizeAddress(diceAddress);

	socket.logger?.info(`Iterating to ${base32crockford.encode(nDiceAddress)} from ${base32crockford.encode(initialNode.diceAddress)}`);

	if (!initialNode) return [];

	let closestNodes = [initialNode];
	let closestNode = closestNodes.at(0);

	while (closestNode && getBitwiseDistance(closestNode.diceAddress, nDiceAddress) > 0) {
		try {
			const nodes = await socket.listNodes(closestNode, nDiceAddress, undefined);

			const nextNodes = uniqBy(
				closestNodes.concat(nodes).filter((node) => !node.endpoints.length && compare(node.diceAddress, socket.node.diceAddress) !== 0),
				(node) => hex.encode(node.diceAddress)
			)
				.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.diceAddress, nDiceAddress) - getBitwiseDistance(nodeB.diceAddress, nDiceAddress))
				.slice(0, 20);

			const nextNode = nextNodes.at(0);

			if (!nextNode || compare(nextNode.diceAddress, closestNode.diceAddress) === 0) return;

			yield nextNodes;

			closestNodes = nextNodes;
			closestNode = nextNode;
		} catch (error) {
			socket.emit("error", error);

			return;
		}
	}
}
