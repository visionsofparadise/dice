import { KademliaTable } from "kademlia-table";
import { EventEmitterOptions } from "../EventEmitter";
import { Node } from "../Node/Codec";

export namespace OverlayTable {
	export interface Options extends Partial<KademliaTable.Options<Node>>, EventEmitterOptions {}
}

export class OverlayTable extends KademliaTable<Node> {
	constructor(
		public readonly publicKey: Uint8Array,
		public readonly options: OverlayTable.Options
	) {
		super(publicKey, {
			getId(node) {
				return node.publicKey;
			},
			...options,
		});
	}
}
