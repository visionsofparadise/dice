import { Socket } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";
import { NatType } from "../../Node/Constant";

export const routeSocketMessage = async (socket: Socket, message: Message): Promise<Address> => {
	switch (message.targetNode.natType) {
		case NatType.NAT1:
			return message.targetNode.address;
		case NatType.NAT3: {
			if (socket.node.natType === NatType.NAT4) {
				return socket.node.relayNode.address;
			} else {
				await socket.punch(message.targetNode);

				return message.targetNode.address;
			}
		}
		case NatType.NAT4: {
			if (socket.node.isEqualPublicKey(message.targetNode.relayNode)) {
				return message.targetNode.address;
			} else {
				return message.targetNode.relayNode.address;
			}
		}
	}
};
