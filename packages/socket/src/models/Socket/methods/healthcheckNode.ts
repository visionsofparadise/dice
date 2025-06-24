import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat } from "../../Endpoint/Constant";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { Nat4Endpoint } from "../../Endpoint/Nat4";
import { NetworkAddress } from "../../NetworkAddress";

export const healthcheckSocketNode = async (socket: Socket): Promise<void> => {
	try {
		if (socket.isHealthcheckingNode) return;

		socket.isHealthcheckingNode = true;
		socket.logger?.debug("Healthchecking node");

		const results = await Promise.allSettled(
			socket.udpSockets.map(async (udpSocket) => {
				const externalAddressResult = await socket.getExternalAddress(udpSocket);

				const { networkAddressA, networkAddressB } = externalAddressResult;

				let endpoint: Endpoint | undefined;

				try {
					if (!socket.options.natType || socket.options.natType === Nat.NAT4) {
						if (networkAddressA.toString() !== networkAddressB.toString()) {
							endpoint = new Nat4Endpoint({
								networkAddress: networkAddressA,
							});
						}
					}

					if (!socket.options.natType || socket.options.natType === Nat.NAT3) {
						if (networkAddressA.toString() === networkAddressB.toString()) {
							endpoint = new Nat3Endpoint({
								networkAddress: networkAddressA,
							});
						}
					}

					if (!socket.options.natType || socket.options.natType === Nat.NAT1) {
						if (networkAddressA.toString() === networkAddressB.toString()) {
							if (await socket.isSocketEndpointNat1(udpSocket, externalAddressResult)) {
								endpoint = new Nat1Endpoint({
									networkAddress: networkAddressA,
								});
							}
						}
					}
				} catch (error) {}

				if (endpoint) return { endpoint, udpSocket };
			})
		);

		const externalUdpSocketMap = new Map<string, Socket.UdpSocket>();
		const internalEndpointMap = new Map<string, Endpoint>();

		for (const result of results) {
			if (result.status !== "fulfilled" || !result.value) continue;

			const { endpoint, udpSocket } = result.value;

			externalUdpSocketMap.set(endpoint.key, udpSocket);
			internalEndpointMap.set(NetworkAddress.fromRemoteInfo(udpSocket.address()).toString(), endpoint);
		}

		socket.externalUdpSocketMap = externalUdpSocketMap;
		socket.internalEndpointMap = internalEndpointMap;
		socket.node = socket.node.update(
			{
				endpoints: [...internalEndpointMap.values()],
			},
			socket.keys
		);
	} finally {
		socket.logger?.debug("Healthchecking node complete");
		socket.isHealthcheckingNode = false;
	}
};
