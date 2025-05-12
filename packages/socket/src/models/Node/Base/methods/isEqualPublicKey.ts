import { compare } from "uint8array-tools";
import { BaseNode } from "..";

export const isBaseNodeEqualPublicKey = (nodeA: BaseNode, nodeB: BaseNode): boolean => {
	if (nodeA.sequenceNumber === nodeB.sequenceNumber && nodeA.generation === nodeB.generation) {
		return compare(nodeA.rSignature.signature, nodeB.rSignature.signature) === 0;
	}

	return compare(nodeA.publicKey, nodeB.publicKey) === 0;
};
