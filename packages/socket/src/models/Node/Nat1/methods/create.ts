import { Nat1Node } from "..";
import { RequiredProperties } from "../../../../utilities/RequiredProperties";
import { Keys } from "../../../Keys";
import { NatType } from "../../Constant";

export const createNat1Node = (properties: RequiredProperties<Nat1Node.Properties, "address">, keys: Keys): Nat1Node => {
	const defaultProperties: Omit<Nat1Node.Properties, "rSignature"> = {
		natType: NatType.NAT1,
		address: properties.address,
		sequenceNumber: properties.sequenceNumber !== undefined ? properties.sequenceNumber : 0,
		generation: properties.generation !== undefined ? properties.generation : 0,
		isDisabled: properties.isDisabled !== undefined ? properties.isDisabled : false,
	};

	const hash = Nat1Node.hash(defaultProperties);

	const rSignature = keys.rSign(hash);

	const node = new Nat1Node({
		...defaultProperties,
		rSignature,
	});

	node.publicKey = keys.publicKey;

	return node;
};
