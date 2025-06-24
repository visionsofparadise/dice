import { Node } from "..";
import { Keys } from "../../Keys";

export const createNode = (properties: Partial<Node.Properties>, keys: Keys): Node => {
	const defaultProperties: Omit<Node.Properties, "rSignature"> = {
		endpoints: properties.endpoints || [],
		sequenceNumber: properties.sequenceNumber || 0,
		generation: properties.generation || 0,
	};

	const hash = Node.hash(defaultProperties);

	const rSignature = keys.rSign(hash);

	const node = new Node(
		{
			...defaultProperties,
			rSignature,
		},
		{
			diceAddress: keys.diceAddress,
			hash,
			publicKey: keys.publicKey,
		}
	);

	return node;
};
