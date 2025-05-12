import { compare } from "uint8array-tools";
import { Nat1Node } from "..";
import { Keys } from "../../../Keys";

export const updateNat1Node = (node: Nat1Node, properties: Partial<Omit<Nat1Node.Properties, "natType" | "rSignature">>, keys: Keys): Nat1Node => {
	const updatedNode = new Nat1Node({
		...node.properties,
		...properties,
	});

	if (compare(node.checksum, updatedNode.checksum) === 0) return node;

	if (!properties.sequenceNumber && !properties.generation) updatedNode.sequenceNumber++;

	const rSignature = keys.rSign(updatedNode.hash);

	const signedNode = new Nat1Node({
		...updatedNode.properties,
		rSignature,
	});

	signedNode.publicKey = keys.publicKey;

	return signedNode;
};
