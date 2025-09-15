import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { Address } from "../models/Address";
import { Client } from "../models/Client";
import { Endpoint } from "../models/Endpoint";
import { spawnIntegrationBootstrapClients } from "./spawnIntegrationBootstrapClients";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationClients = async (
	options: Partial<Client.Options> | undefined,
	callback: (bootstrapClients: [Client, Client, Client], clients: [Client, Client]) => any
): Promise<void> => {
	await spawnIntegrationBootstrapClients(undefined, async (bootstrapClients) => {
		const bootstrapAddresses = bootstrapClients.map((bootstrapSocket) => bootstrapSocket.endpoint.address!);

		const clients: Array<Client> = [];

		try {
			for (let i = 0; i < 2; i++) {
				const socket = createSocket("udp4");

				await new Promise<void>((resolve) => {
					socket.bind(undefined, "127.0.0.1", () => resolve());
				});

				const client = new Client({
					bootstrapAddresses,
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

			await callback(bootstrapClients, clients as [Client, Client]);
		} finally {
			for (const client of clients) {
				client.close();
				client.socket.close();
			}
		}
	});
};
