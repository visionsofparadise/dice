import { Socket } from "..";
import { NatType } from "../../Node/Constant";

export const bootstrapSocketNode = async (socket: Socket, isPortMappingDisabled = true): Promise<void> => {
	try {
		if (socket.isBootstrappingNode) return;

		socket.isBootstrappingNode = true;

		if (!isPortMappingDisabled) {
			const mappings = await socket.portControl.getActiveMappings();

			for (const key of Object.keys(mappings)) await socket.portControl.deleteMapping(parseInt(key));

			await socket.portControl.addMapping(socket.localAddress.port, socket.node.address.port, 0);
		}

		const externalAddressResult = await socket.getExternalAddress();

		if (!socket.options.natType || socket.options.natType === NatType.NAT4) {
			socket.bootstrapNat4Node(externalAddressResult);
		}

		if (!socket.options.natType || socket.options.natType === NatType.NAT3) {
			socket.bootstrapNat3Node(externalAddressResult);
		}

		if (!socket.options.natType || socket.options.natType === NatType.NAT1) {
			await socket.bootstrapNat1Node(externalAddressResult);
		}

		if (
			!socket.options.isPortMappingDisabled &&
			isPortMappingDisabled &&
			(socket.node.isDisabled || socket.node.natType !== NatType.NAT1) &&
			(!socket.options.natType || socket.options.natType === NatType.NAT1)
		) {
			return socket.bootstrapNode(false);
		}
	} catch (error) {
		socket.emit("error", error);

		throw error;
	} finally {
		socket.isBootstrappingNode = false;
	}
};
