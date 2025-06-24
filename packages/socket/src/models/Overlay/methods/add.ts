import { base32crockford } from "@scure/base";
import { Overlay } from "..";
import { Node } from "../../Node";

export const addOverlayNode = (overlay: Overlay, node: Node): boolean => {
	const result = overlay.table.add(node);

	if (result) {
		for (const endpoint of node.endpoints) {
			if ("networkAddress" in endpoint) overlay.networkAddressSet.add(endpoint.networkAddress.toString());
		}

		overlay.logger?.debug(`Added node ${base32crockford.encode(overlay.table.getId(node))}`);

		overlay.emit("add", node);
	}

	return result;
};
