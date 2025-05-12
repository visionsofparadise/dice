import { compare } from "uint8array-tools";
import { Nat3Node } from "..";
import { Keys } from "../../../Keys";

export const updateNat3Node = (node: Nat3Node, properties: Partial<Omit<Nat3Node.Properties, "natType" | "rSignature">>, keys: Keys): Nat3Node => {
	const updatedNode = new Nat3Node({
		...node.properties,
		...properties,
	});

	if (compare(node.checksum, updatedNode.checksum) === 0) return node;

	if (!properties.sequenceNumber && !properties.generation) updatedNode.sequenceNumber++;

	const rSignature = keys.rSign(updatedNode.hash);

	const signedNode = new Nat3Node({
		...updatedNode.properties,
		rSignature,
	});

	signedNode.publicKey = keys.publicKey;

	return signedNode;
};
