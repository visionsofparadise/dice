import { Socket } from "..";
import { isSequencedAfter } from "../../../utilities/Sequenced";
import { Node } from "../../Node/Codec";
import { NatType } from "../../Node/Constant";

export const updateSocketRelayNode = async (socket: Socket, relayNode: Node): Promise<void> => {
	try {
		if (!("relayNode" in socket.node)) return;
		if (!socket.node.isEqualPublicKey(relayNode)) return;

		if (relayNode.natType !== NatType.NAT1 || relayNode.ipType !== socket.node.ipType) throw new Error("Invalid relay node");

		if (isSequencedAfter(relayNode, socket.node.relayNode)) {
			socket.node = socket.node.update(
				{
					relayNode,
				},
				socket.keys
			);
		}
	} catch (error) {
		socket.emit("error", error);

		await socket.bootstrapNode();
	}
};
