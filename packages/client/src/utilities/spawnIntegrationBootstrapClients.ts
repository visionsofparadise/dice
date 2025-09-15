import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { Address } from "../models/Address";
import { Client } from "../models/Client";
import { Endpoint } from "../models/Endpoint";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const spawnIntegrationBootstrapClients = async (options: Partial<Client.Options> | undefined, callback: (clients: [Client, Client, Client]) => any): Promise<void> => {
	const clients: Array<Client> = [];

	try {
		for (let i = 0; i < 3; i++) {
			const socket = createSocket("udp4");

			await new Promise<void>((resolve) => {
				socket.bind(undefined, "127.0.0.1", () => resolve());
			});

			const client = new Client({
				bootstrapAddresses: [],
				logger,
				socket,
				...options,
			});

			client.endpoint = new Endpoint({
				address: Address.fromRemoteInfo(socket.address()),
			});

			clients.push(client);
		}

		for (const clientA of clients) {
			for (const clientB of clients) {
				if (clientA.endpoint.address!.key === clientB.endpoint.address!.key) continue;

				clientA.endpoint.relayAddresses.push(clientB.endpoint.address!);
			}

			await clientA.open(false);
			clearInterval(clientA.healthcheckInterval);
		}

		await callback(clients as [Client, Client, Client]);
	} finally {
		for (const client of clients) {
			client.close();
			client.socket.close();
		}
	}
};
