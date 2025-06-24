import { compare } from "uint8array-tools";
import { Node } from "..";
import { Keys } from "../../Keys";

export const updateNode = (node: Node, properties: Partial<Omit<Node.Properties, "rSignature">>, keys: Keys): Node => {
	const updatedNode = new Node({
		...node.properties,
		...properties,
	});

	if (compare(node.checksum, updatedNode.checksum) === 0) return node;

	if (!properties.sequenceNumber && !properties.generation) updatedNode.sequenceNumber++;

	const rSignature = keys.rSign(updatedNode.hash);

	const signedNode = new Node(
		{
			...updatedNode.properties,
			rSignature,
		},
		{
			diceAddress: keys.diceAddress,
			hash: updatedNode.hash,
			publicKey: keys.publicKey,
		}
	);

	return signedNode;
};
