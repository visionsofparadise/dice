import { base32crockford } from "@scure/base";
import { Overlay } from "..";
import { Node } from "../../Node";

export const removeOverlayNode = (overlay: Overlay, node: Node): boolean => {
	const id = overlay.table.getId(node);

	const result = overlay.table.remove(id);

	if (result) {
		for (const endpoint of node.endpoints) {
			if ("networkAddress" in endpoint) overlay.networkAddressSet.delete(endpoint.networkAddress.toString());
		}

		overlay.logger?.debug(`Removed node ${base32crockford.encode(id)}`);

		overlay.emit("remove", node);
	}

	return result;
};
