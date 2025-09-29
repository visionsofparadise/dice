import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { AddressType } from "../models/Address/Type";
import { Client } from "../models/Client";
import { Ipv4Address } from "../models/Ipv4Address";
import { Ipv6Address } from "../models/Ipv6Address";
import { spawnIntegrationBootstrapClients } from "./spawnIntegrationBootstrapClients";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationClients = async (
	options: Partial<Client.Options> | undefined,
	callback: (bootstrapClients: [Client, Client, Client], clients: [Client, Client]) => any
): Promise<void> => {
	await spawnIntegrationBootstrapClients(undefined, async (bootstrapClients) => {
		const bootstrap6Addresses = bootstrapClients.map((bootstrapSocket) => bootstrapSocket.overlays[AddressType.IPv6]?.external!);
		const bootstrap4Addresses = bootstrapClients.map((bootstrapSocket) => bootstrapSocket.overlays[AddressType.IPv4]?.external!);

		const clients: Array<Client> = [];

		try {
			for (let i = 0; i < 2; i++) {
				const socket6 = createSocket("udp6");

				await new Promise<void>((resolve) => {
					socket6.bind(undefined, "::1", () => resolve());
				});

				const socket4 = createSocket("udp4");

				await new Promise<void>((resolve) => {
					socket4.bind(undefined, "127.0.0.1", () => resolve());
				});

				const client = new Client({
					[AddressType.IPv6]: {
						bootstrapAddresses: bootstrap6Addresses,
						isPrefixFilteringDisabled: true,
						socket: socket6,
					},
					[AddressType.IPv4]: {
						bootstrapAddresses: bootstrap4Addresses,
						isPrefixFilteringDisabled: true,
						socket: socket4,
					},
					logger,
					...options,
				});

				client.overlays[AddressType.IPv6]!.external = Ipv6Address.fromAddressInfo(socket6.address());
				client.overlays[AddressType.IPv4]!.external = Ipv4Address.fromAddressInfo(socket4.address());

				clients.push(client);
			}

			for (const clientA of clients) {
				for (const clientB of clients) {
					if (clientA.diceAddress.toString() === clientB.diceAddress.toString()) continue;

					clientA.overlays[AddressType.IPv6]?.coordinatorMap.set(clientB.overlays[AddressType.IPv6]?.external!.key!, clientB.overlays[AddressType.IPv6]?.external!);
					clientA.overlays[AddressType.IPv4]?.coordinatorMap.set(clientB.overlays[AddressType.IPv4]?.external!.key!, clientB.overlays[AddressType.IPv4]?.external!);
				}

				await clientA.open(false);
				clearInterval(clientA.overlays[AddressType.IPv6]?.healthcheckInterval);
				clearInterval(clientA.overlays[AddressType.IPv4]?.healthcheckInterval);
			}

			await callback(bootstrapClients, clients as [Client, Client]);
		} finally {
			for (const client of clients) {
				client.close();

				for (const overlay of Object.values(client.overlays)) {
					overlay.socket.close();
				}
			}
		}
	});
};
