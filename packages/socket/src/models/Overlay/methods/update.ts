import { base58 } from "@scure/base";
import { Overlay } from "..";
import { isSequencedAfter } from "../../../utilities/Sequenced";
import { Node } from "../../Node/Codec";

export const updateOverlayNode = (overlay: Overlay, nextNode: Node): boolean => {
	const id = overlay.table.getId(nextNode);

	const previousNode = overlay.table.peekById(id);

	if (!previousNode || !isSequencedAfter(nextNode, previousNode)) return false;

	const result = overlay.table.update(nextNode);

	if (result) {
		overlay.addressSet.delete(previousNode.address.toString());
		overlay.addressSet.add(nextNode.address.toString());

		overlay.logger?.debug(`Updated node ${base58.encode(id)}`);

		overlay.emit("update", previousNode, nextNode);
	}

	return result;
};
