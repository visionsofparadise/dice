import { Socket } from "..";
import { Nat } from "../../Endpoint/Constant";
import { DiceError } from "../../Error";
import { NetworkAddress } from "../../NetworkAddress";
import { Node } from "../../Node";

export interface ExternalAddressResult {
	reflectNodeA: Node;
	networkAddressA: NetworkAddress;
	reflectNodeB: Node;
	networkAddressB: NetworkAddress;
}

export const getSocketExternalAddress = async (socket: Socket, udpSocket: Socket.UdpSocket): Promise<ExternalAddressResult> => {
	const localNetworkAddress = NetworkAddress.fromRemoteInfo(udpSocket.address());

	socket.logger?.debug(`Finding test nodes for ${NetworkAddress.fromRemoteInfo(udpSocket.address()).toString()}`);

	const [reflectNodeA, reflectNodeB] = socket.overlay.sample(2, (node) => {
		return !!node.endpoints.find((endpoint) => endpoint.nat === Nat.NAT1 && endpoint.networkAddress.family === localNetworkAddress.family);
	});

	const reflectEndpointA = reflectNodeA?.endpoints.find((endpoint) => endpoint.nat === Nat.NAT1);
	const reflectEndpointB = reflectNodeA?.endpoints.find((endpoint) => endpoint.nat === Nat.NAT1);

	if (!reflectNodeA || !reflectEndpointA || !reflectNodeB || !reflectEndpointB) {
		throw new DiceError("Could not find nodes to get external address");
	}

	socket.logger?.debug(`Reflecting test nodes for ${NetworkAddress.fromRemoteInfo(udpSocket.address()).toString()}`);

	const [networkAddressA, networkAddressB] = await Promise.all([
		socket.reflect(udpSocket, { diceAddress: reflectNodeA.diceAddress, endpoint: reflectEndpointA }),
		socket.reflect(udpSocket, { diceAddress: reflectNodeB.diceAddress, endpoint: reflectEndpointB }),
	]);

	socket.logger?.debug(`Got external addresses ${networkAddressA.toString()} ${networkAddressB.toString()}`);

	return {
		reflectNodeA,
		networkAddressA,
		reflectNodeB,
		networkAddressB,
	};
};
