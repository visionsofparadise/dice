import { base58 } from "@scure/base";
import { Overlay } from "..";
import { Node } from "../../Node/Codec";

export const addOverlayNode = (overlay: Overlay, node: Node): boolean => {
	const result = overlay.table.add(node);

	if (result) {
		overlay.addressSet.add(node.address.toString());

		overlay.logger?.debug(`Added node ${base58.encode(overlay.table.getId(node))}`);

		overlay.emit("add", node);
	}

	return result;
};
