import { KademliaTable } from "kademlia-table";
import { Node } from "../Node";

export class OverlayTable extends KademliaTable<Node> {
	constructor(public readonly address: Uint8Array) {
		super(address, {
			compare(nodeA, nodeB) {
				return nodeB.score - nodeA.score;
			},
			getId(node) {
				return node.diceAddress;
			},
		});
	}

	*iterateNodes(d: number): IterableIterator<Array<Node>> {
		let depth = 0;

		while (true) {
			const sign = depth % 2 === 0 ? 1 : -1;
			const offset = Math.ceil(depth / 2);
			const signOffset = sign * offset;

			if (offset > Math.max(d, this.buckets.length - 1 - d)) break;

			const i = d + signOffset;

			if (0 > i || i > this.buckets.length - 1) {
				depth++;

				continue;
			}

			const nodes = this.buckets[i];

			if (nodes) yield nodes;

			depth++;
		}
	}
}
