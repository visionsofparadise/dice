import { Nat4Node } from "..";
import { RequiredProperties } from "../../../../utilities/RequiredProperties";
import { Keys } from "../../../Keys";
import { NatType } from "../../Constant";

export const createNat4Node = (properties: RequiredProperties<Nat4Node.Properties, "address" | "relayNode">, keys: Keys): Nat4Node => {
	const defaultProperties: Omit<Nat4Node.Properties, "rSignature"> = {
		natType: NatType.NAT4,
		address: properties.address,
		relayNode: properties.relayNode,
		sequenceNumber: properties.sequenceNumber !== undefined ? properties.sequenceNumber : 0,
		generation: properties.generation !== undefined ? properties.generation : 0,
		isDisabled: properties.isDisabled !== undefined ? properties.isDisabled : false,
	};

	const hash = Nat4Node.hash(defaultProperties);

	const rSignature = keys.rSign(hash);

	const node = new Nat4Node({
		...defaultProperties,
		rSignature,
	});

	node.publicKey = keys.publicKey;

	return node;
};
