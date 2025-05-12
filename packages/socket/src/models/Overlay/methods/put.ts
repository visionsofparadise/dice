import { compare } from "uint8array-tools";
import { Overlay } from "..";
import { Node } from "../../Node/Codec";

export const putOverlayNode = (overlay: Overlay, node: Node): boolean => {
	if (
		node.isDisabled ||
		node.ipType !== overlay.options.ipType ||
		compare(node.publicKey, overlay.keys.publicKey) === 0 ||
		overlay.options.bootstrapNodes.some((bootstrapNode) => node.isEqualPublicKey(bootstrapNode))
	) {
		return overlay.remove(node);
	}

	if (overlay.table.has(overlay.table.getId(node))) {
		return overlay.update(node);
	} else {
		return overlay.add(node);
	}
};
