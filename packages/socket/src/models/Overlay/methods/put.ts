import { compare } from "uint8array-tools";
import { Overlay } from "..";
import { Node } from "../../Node";

export const putOverlayNode = (overlay: Overlay, node: Node): boolean => {
	const id = overlay.table.getId(node);

	if (!node.endpoints.length || compare(id, overlay.table.id) === 0 || overlay.options.bootstrapNodes.some((bootstrapNode) => compare(id, overlay.table.getId(bootstrapNode)) === 0)) {
		return overlay.remove(node);
	}

	if (overlay.table.has(id)) {
		return overlay.update(node);
	} else {
		return overlay.add(node);
	}
};
