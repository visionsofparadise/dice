import { Socket } from "..";
import { Address } from "../../Address";
import { NatType } from "../../Node/Constant";
import { Nat1Node } from "../../Node/Nat1";

export interface ExternalAddressResult {
	reflectNodeA: Nat1Node;
	addressA: Address;
	reflectNodeB: Nat1Node;
	addressB: Address;
}

export const getSocketExternalAddress = async (socket: Socket): Promise<ExternalAddressResult> => {
	const [reflectNodeA, reflectNodeB] = await socket.searchNode(2, (node) => node.natType === NatType.NAT1);

	if (!reflectNodeA || reflectNodeA.natType !== NatType.NAT1 || !reflectNodeB || reflectNodeB.natType !== NatType.NAT1) {
		throw new Error("Could not find nodes to get external address");
	}

	const [addressA, addressB] = await Promise.all([socket.reflect(reflectNodeA), socket.reflect(reflectNodeB)]);

	socket.logger?.debug(`Got external addresses ${addressA.toString()} ${addressB.toString()}`);

	return {
		reflectNodeA,
		addressA,
		reflectNodeB,
		addressB,
	};
};
