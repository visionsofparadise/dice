import { shuffle } from "@technically/lodash";
import { Overlay } from "..";
import { Node } from "../../Node/Codec";

export const sampleOverlayNodes = (overlay: Overlay, count: number, filter: (node: Node) => boolean): Array<Node> => {
	const ids: Array<Uint8Array> = [];

	for (const node of overlay.table) {
		if (!filter(node)) continue;

		ids.push(overlay.table.getId(node));
	}

	const nodes: Array<Node> = [];

	for (const id of shuffle(ids).slice(0, count)) {
		const node = overlay.table.getById(id);

		if (!node) continue;

		nodes.push(node);
	}

	return nodes;
};
