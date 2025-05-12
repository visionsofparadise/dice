import { compare } from "uint8array-tools";
import { Nat4Node } from "..";
import { Keys } from "../../../Keys";

export const updateNat4Node = (node: Nat4Node, properties: Partial<Omit<Nat4Node.Properties, "natType" | "rSignature">>, keys: Keys): Nat4Node => {
	const updatedNode = new Nat4Node({
		...node.properties,
		...properties,
	});

	if (compare(node.checksum, updatedNode.checksum) === 0) return node;

	if (!properties.sequenceNumber && !properties.generation) updatedNode.sequenceNumber++;

	const rSignature = keys.rSign(updatedNode.hash);

	const signedNode = new Nat4Node({
		...updatedNode.properties,
		rSignature,
	});

	signedNode.publicKey = keys.publicKey;

	return signedNode;
};
