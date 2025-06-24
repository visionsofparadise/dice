import { createSocket } from "dgram";
import log, { LogLevelNumbers } from "loglevel";
import { Nat } from "../models/Endpoint/Constant";
import { Nat1Endpoint } from "../models/Endpoint/Nat1";
import { NetworkAddress } from "../models/NetworkAddress";
import { IpFamily } from "../models/NetworkAddress/Constant";
import { Node } from "../models/Node";
import { Socket } from "../models/Socket";

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

export const spawnIntegrationBootstrapSockets = async (options?: Partial<Socket.Options>): Promise<Array<Socket>> => {
	const basePort = 8000;
	const sockets: Array<Socket> = [];

	for (let i = 0; i < 3; i++) {
		const udpSocket = createSocket("udp4");

		await new Promise<void>((resolve) => udpSocket.bind(basePort + i, "127.0.0.1", () => resolve()));

		const socket = new Socket({
			bootstrapNodes: [],
			logger: log,
			natType: Nat.NAT1,
			udpSockets: [udpSocket],
			...options,
		});

		const endpoint = new Nat1Endpoint({
			networkAddress: new NetworkAddress({
				family: IpFamily.IPv4,
				address: "127.0.0.1",
				port: basePort + i,
			}),
		});

		socket.externalUdpSocketMap.set(endpoint.key, udpSocket);
		socket.internalEndpointMap.set(NetworkAddress.fromRemoteInfo(udpSocket.address()).toString(), endpoint);
		socket.node = socket.node.update(
			{
				endpoints: [endpoint],
			},
			socket.keys
		);

		sockets.push(socket);
	}

	for (const socketA of sockets) {
		for (const socketB of sockets) {
			socketA.overlay.put(socketB.node);
		}

		await socketA.open(false);
		clearInterval(socketA.healthcheckNodeInterval);
		clearInterval(socketA.healthcheckOverlayInterval);
	}

	return sockets;
};

export const spawnIntegrationBootstrapNodes = async (callback: (bootstrapNodes: Array<Node>) => any): Promise<void> => {
	const bootstrapSockets = await spawnIntegrationBootstrapSockets();
	const bootstrapNodes = bootstrapSockets.map((socket) => socket.node);

	try {
		await callback(bootstrapNodes);
	} catch (error) {
	} finally {
		for (const socket of bootstrapSockets) {
			socket.close();

			for (const udpSocket of socket.options.udpSockets) {
				udpSocket.close();
				udpSocket.unref();
			}
		}
	}
};
