import { base58 } from "@scure/base";
import { uniqBy } from "@technically/lodash";
import { getBitwiseDistance } from "kademlia-table";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { PublicKeyCodec } from "../../Keys/Codec";
import { Node } from "../../Node/Codec";

export async function* iterateSocketNodes(socket: Socket, publicKey: Uint8Array, initialNode: Node, isAddingNodes = true): AsyncIterableIterator<Array<Node>> {
	socket.logger?.info(`Iterating to ${base58.encode(publicKey)} from ${base58.encode(initialNode.publicKey)}`);

	const byteLength = PublicKeyCodec.byteLength();

	if (!initialNode) return [];

	let closestNodes = [initialNode];
	let closestNode = closestNodes.at(0);

	while (closestNode && getBitwiseDistance(closestNode.publicKey, publicKey, byteLength) > 0) {
		try {
			const nodes = await socket.listNodes(closestNode, publicKey, undefined, { isAddingNodes });

			const nextNodes = uniqBy(
				closestNodes.concat(nodes).filter((node) => !node.isDisabled && !socket.node.isEqualPublicKey(node)),
				(node) => base58.encode(node.publicKey)
			)
				.sort((nodeA, nodeB) => getBitwiseDistance(nodeA.publicKey, publicKey, byteLength) - getBitwiseDistance(nodeB.publicKey, publicKey, byteLength))
				.slice(0, 20);

			const nextNode = nextNodes.at(0);

			if (!nextNode || compare(nextNode.publicKey, closestNode.publicKey) === 0) return;

			yield nextNodes;

			closestNodes = nextNodes;
			closestNode = nextNode;
		} catch (error) {
			socket.emit("error", error);

			return;
		}
	}
}
