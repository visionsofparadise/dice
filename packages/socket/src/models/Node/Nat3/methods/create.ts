import { Nat3Node } from "..";
import { RequiredProperties } from "../../../../utilities/RequiredProperties";
import { Keys } from "../../../Keys";
import { NatType } from "../../Constant";

export const createNat3Node = (properties: RequiredProperties<Nat3Node.Properties, "address" | "relayNode">, keys: Keys): Nat3Node => {
	const defaultProperties: Omit<Nat3Node.Properties, "rSignature"> = {
		natType: NatType.NAT3,
		address: properties.address,
		relayNode: properties.relayNode,
		sequenceNumber: properties.sequenceNumber !== undefined ? properties.sequenceNumber : 0,
		generation: properties.generation !== undefined ? properties.generation : 0,
		isDisabled: properties.isDisabled !== undefined ? properties.isDisabled : false,
	};

	const hash = Nat3Node.hash(defaultProperties);

	const rSignature = keys.rSign(hash);

	const node = new Nat3Node({
		...defaultProperties,
		rSignature,
	});

	node.publicKey = keys.publicKey;

	return node;
};
