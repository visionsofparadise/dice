import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { Address } from "../models/Address";
import { Nat1Endpoint } from "../models/Endpoint/Nat1";
import { Socket } from "../models/Socket";
import { spawnIntegrationBootstrapSockets } from "./spawnIntegrationBootstrapSockets";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationSockets = async (
	options: Partial<Socket.Options> | undefined,
	callback: (bootstrapSockets: [Socket, Socket, Socket], sockets: [Socket, Socket]) => any
): Promise<void> => {
	await spawnIntegrationBootstrapSockets(undefined, async (bootstrapSockets) => {
		const bootstrapAddresses = bootstrapSockets.map((bootstrapSocket) => bootstrapSocket.session.endpoint!.address);

		const sockets: Array<Socket> = [];

		try {
			for (let i = 0; i < 2; i++) {
				const udpSocket = createSocket("udp4");

				await new Promise<void>((resolve) => {
					udpSocket.bind(undefined, "127.0.0.1", () => resolve());
				});

				const socket = new Socket({
					bootstrapAddresses,
					isDiscoveryEnabled: false,
					logger,
					udpSocket,
					...options,
				});

				socket.session.endpoint = new Nat1Endpoint({
					address: Address.fromRemoteInfo(udpSocket.address()),
				});

				sockets.push(socket);
			}

			for (const socketA of sockets) {
				for (const socketB of sockets) {
					if (socketA.session.endpoint!.address.key === socketB.session.endpoint!.address.key) continue;

					socketA.session.cache.pool.set(socketB.session.endpoint!.address.key, socketB.session.endpoint!.address);
				}

				await socketA.open(false);
				clearInterval(socketA.session.healthcheckEndpointInterval);
				clearInterval(socketA.session.healthcheckAddressPoolInterval);
			}

			await callback(bootstrapSockets, sockets as [Socket, Socket]);
		} finally {
			for (const socket of sockets) {
				socket.close();
				socket.session.udpSocket.close();
			}
		}
	});
};
