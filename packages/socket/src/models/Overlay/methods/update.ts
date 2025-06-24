import { base32crockford } from "@scure/base";
import { Overlay } from "..";
import { isSequencedAfter } from "../../../utilities/Sequenced";
import { Node } from "../../Node";

export const updateOverlayNode = (overlay: Overlay, nextNode: Node): boolean => {
	const id = overlay.table.getId(nextNode);

	const previousNode = overlay.table.peekById(id);

	if (!previousNode || !isSequencedAfter(nextNode, previousNode)) return false;

	const result = overlay.table.update(nextNode);

	if (result) {
		for (const endpoint of previousNode.endpoints) {
			if ("networkAddress" in endpoint) overlay.networkAddressSet.delete(endpoint.networkAddress.toString());
		}

		for (const endpoint of nextNode.endpoints) {
			if ("networkAddress" in endpoint) overlay.networkAddressSet.add(endpoint.networkAddress.toString());
		}

		overlay.logger?.debug(`Updated node ${base32crockford.encode(id)}`);

		overlay.emit("update", previousNode, nextNode);
	}

	return result;
};
