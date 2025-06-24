import { Socket } from "..";
import { Nat } from "../../Endpoint/Constant";
import { ExternalAddressResult } from "./getExternalAddress";

export const isSocketEndpointNat1 = async (socket: Socket, udpSocket: Socket.UdpSocket, externalAddressResult: ExternalAddressResult): Promise<boolean> => {
	try {
		const { networkAddressA, networkAddressB } = externalAddressResult;

		if (networkAddressA.toString() !== networkAddressB.toString()) return false;

		const targetNode = await socket.searchNode((node) => {
			return !!node.endpoints.find(
				(endpoint) =>
					endpoint.nat !== Nat.NAT4 &&
					endpoint.networkAddress.family === networkAddressA.family &&
					!socket.cache.contact.has(`${networkAddressA.toString()}-${endpoint.networkAddress.toString()}`)
			);
		});

		if (!targetNode) return false;

		const targetEndpoint = targetNode.endpoints.find(
			(endpoint) =>
				endpoint.nat !== Nat.NAT4 &&
				endpoint.networkAddress.family === networkAddressA.family &&
				!socket.cache.contact.has(`${networkAddressA.toString()}-${endpoint.networkAddress.toString()}`)
		);

		if (!targetEndpoint || targetEndpoint.nat === Nat.NAT4) return false;

		await socket.punch(udpSocket, { diceAddress: targetNode.diceAddress, endpoint: targetEndpoint }, undefined, {
			isPrePunchDisabled: true,
		});

		return true;
	} catch (error) {
		return false;
	}
};
