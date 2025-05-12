import { base58 } from "@scure/base";
import { Overlay } from "..";
import { Node } from "../../Node/Codec";

export const removeOverlayNode = (overlay: Overlay, node: Node): boolean => {
	const id = overlay.table.getId(node);

	const result = overlay.table.remove(id);

	if (result) {
		overlay.addressSet.delete(node.address.toString());

		overlay.logger?.debug(`Removed node ${base58.encode(id)}`);

		overlay.emit("remove", node);
	}

	return result;
};
