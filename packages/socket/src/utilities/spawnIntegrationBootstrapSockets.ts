import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { Address } from "../models/Address";
import { Nat } from "../models/Endpoint/Constant";
import { Nat1Endpoint } from "../models/Endpoint/Nat1";
import { Socket } from "../models/Socket";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const spawnIntegrationBootstrapSockets = async (options: Partial<Socket.Options> | undefined, callback: (sockets: [Socket, Socket, Socket]) => any): Promise<void> => {
	const sockets: Array<Socket> = [];

	try {
		for (let i = 0; i < 3; i++) {
			const udpSocket = createSocket("udp4");

			await new Promise<void>((resolve) => {
				udpSocket.bind(undefined, "127.0.0.1", () => resolve());
			});

			const socket = new Socket({
				bootstrapAddresses: [],
				isDiscoveryEnabled: false,
				logger,
				natType: Nat.NAT1,
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

		await callback(sockets as [Socket, Socket, Socket]);
	} finally {
		for (const socket of sockets) {
			socket.close();
			socket.session.udpSocket.close();
		}
	}
};
