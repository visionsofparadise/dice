import { Socket } from "..";
import { Nat3Node } from "../../Node/Nat3";
import { ExternalAddressResult } from "./getExternalAddress";

export const bootstrapSocketNat3Node = (socket: Socket, externalAddressResult: ExternalAddressResult): void => {
	try {
		const { reflectNodeA, addressA, addressB } = externalAddressResult;

		if (addressA.toString() !== addressB.toString()) return;

		socket.node = Nat3Node.create(
			{
				address: addressA,
				relayNode: reflectNodeA,
				sequenceNumber: socket.node.sequenceNumber + 1,
				generation: socket.node.generation,
			},
			socket.keys
		);
	} catch (error) {
		return;
	}
};
