import { Socket } from "..";
import { NatType } from "../../Node/Constant";

export const healthcheckSocketNode = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isHealthcheckingNode) return;

		socket.isHealthcheckingNode = true;

		const { addressA, addressB } = await socket.getExternalAddress();

		switch (socket.node.natType) {
			case NatType.NAT1: {
				if (addressA.toString() !== socket.node.address.toString() || addressB.toString() !== socket.node.address.toString()) throw new Error("Address mistmatch");

				break;
			}
			case NatType.NAT3: {
				if (addressA.toString() !== socket.node.address.toString() || addressB.toString() !== socket.node.address.toString()) throw new Error("Address mistmatch");

				break;
			}
			case NatType.NAT4: {
				if (addressA.toString() === addressB.toString()) throw new Error("Upgrade possible");

				break;
			}
		}

		if ("relayNode" in socket.node) {
			const address = await socket.reflect(socket.node.relayNode);

			if (address.toString() !== socket.node.address.toString()) throw new Error("Address mistmatch");
		}

		if (socket.node.isDisabled)
			socket.node = socket.node.update(
				{
					isDisabled: false,
				},
				socket.keys
			);
	} catch (error) {
		socket.emit("error", error);

		await socket.bootstrapNode();
	} finally {
		socket.isHealthcheckingNode = false;
	}
};
