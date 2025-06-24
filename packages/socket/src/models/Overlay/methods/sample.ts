import { shuffle } from "@technically/lodash";
import { Overlay } from "..";
import { Node } from "../../Node";

export const sampleOverlayNodes = (overlay: Overlay, count: number, filter?: (node: Node) => boolean): Array<Node> => {
	const nodes: Array<Node> = [];

	const d = Math.floor(Math.random() * overlay.table.buckets.length);

	for (const nodes of overlay.table.iterateNodes(d)) {
		for (const node of nodes) {
			if (!node.isHealthchecking && (!filter || filter(node))) {
				nodes.push(node);

				if (nodes.length >= count) return nodes;
			}
		}
	}

	for (const node of shuffle(overlay.options.bootstrapNodes)) {
		if (!node.isHealthchecking && (!filter || filter(node))) {
			nodes.push(node);

			if (nodes.length >= count) return nodes;
		}
	}

	return nodes;
};
