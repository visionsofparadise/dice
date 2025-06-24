import { createSocket } from "dgram";
import log, { LogLevelNumbers } from "loglevel";
import { Nat1Endpoint } from "../models/Endpoint/Nat1";
import { NetworkAddress } from "../models/NetworkAddress";
import { IpFamily } from "../models/NetworkAddress/Constant";
import { Socket } from "../models/Socket";
import { RequiredProperties } from "./RequiredProperties";
import { spawnIntegrationBootstrapNodes } from "./spawnIntegrationBootstrapSockets";

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationSocket = async (port: number, options: RequiredProperties<Socket.Options, "bootstrapNodes">): Promise<Socket> => {
	const udpSocket = createSocket("udp4");

	await new Promise<void>((resolve) => udpSocket.bind(port, "127.0.0.1", () => resolve()));

	return new Socket({
		logger: log,
		...options,
		udpSockets: [udpSocket],
	});
};

export const spawnIntegrationSocketPair = async (callback: (socketA: Socket, socketB: Socket) => any): Promise<void> => {
	await spawnIntegrationBootstrapNodes(async (bootstrapNodes) => {
		const socketA = await spawnIntegrationSocket(4000, { bootstrapNodes });
		const socketB = await spawnIntegrationSocket(4001, { bootstrapNodes });

		try {
			const udpSocketA = socketA.udpSockets[0]!;

			const endpointA = new Nat1Endpoint({
				networkAddress: new NetworkAddress({
					family: IpFamily.IPv4,
					address: "127.0.0.1",
					port: 4000,
				}),
			});

			socketA.externalUdpSocketMap.set(endpointA.key, udpSocketA);
			socketA.internalEndpointMap.set(NetworkAddress.fromRemoteInfo(udpSocketA.address()).toString(), endpointA);
			socketA.node = socketA.node.update(
				{
					endpoints: [endpointA],
				},
				socketA.keys
			);

			const udpSocketB = socketB.udpSockets[0]!;

			const endpointB = new Nat1Endpoint({
				networkAddress: new NetworkAddress({
					family: IpFamily.IPv4,
					address: "127.0.0.1",
					port: 4001,
				}),
			});

			socketB.externalUdpSocketMap.set(endpointB.key, udpSocketB);
			socketB.internalEndpointMap.set(NetworkAddress.fromRemoteInfo(udpSocketB.address()).toString(), endpointB);
			socketB.node = socketB.node.update(
				{
					endpoints: [endpointB],
				},
				socketB.keys
			);

			socketA.overlay.put(socketB.node);
			socketB.overlay.put(socketA.node);

			await socketA.open(false);
			await socketB.open(false);

			await callback(socketA, socketB);
		} catch (error) {
		} finally {
			socketB.close();

			for (const udpSocket of socketB.options.udpSockets) {
				udpSocket.close();
				udpSocket.unref();
			}

			socketA.close();

			for (const udpSocket of socketA.options.udpSockets) {
				udpSocket.close();
				udpSocket.unref();
			}
		}
	});
};
