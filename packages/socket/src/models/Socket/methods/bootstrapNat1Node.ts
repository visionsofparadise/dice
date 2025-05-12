import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { NatType } from "../../Node/Constant";
import { Nat1Node } from "../../Node/Nat1";
import { ExternalAddressResult } from "./getExternalAddress";

export const bootstrapSocketNat1Node = async (socket: Socket, externalAddressResult: ExternalAddressResult): Promise<void> => {
	try {
		const { reflectNodeA, addressA, addressB } = externalAddressResult;

		if (addressA.toString() !== addressB.toString()) return;

		const [punchNode] = await socket.searchNode(
			1,
			(node) => (node.natType === NatType.NAT1 || node.natType === NatType.NAT3) && !socket.cache.contact.has(socket.createCacheKey(node.address)),
			false
		);

		if (!punchNode || (punchNode.natType !== NatType.NAT1 && punchNode.natType !== NatType.NAT3)) return;

		let relayNode = reflectNodeA;

		if (punchNode.natType === NatType.NAT3) relayNode = punchNode.relayNode;

		const punchRequest = new Message({
			sourceNode: socket.node,
			targetNode: punchNode,
			body: {
				type: "punch",
				transactionId: createId(),
			},
		});

		await socket.send(punchRequest, relayNode.address);
		await socket.awaitResponse(punchRequest.body.transactionId);

		socket.node = Nat1Node.create(
			{
				address: addressA,
				sequenceNumber: socket.node.sequenceNumber + 1,
				generation: socket.node.generation,
			},
			socket.keys
		);
	} catch (error) {
		return;
	}
};
