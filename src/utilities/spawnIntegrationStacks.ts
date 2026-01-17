import { createSocket } from "dgram";
import logger, { type LogLevelNumbers } from "loglevel";
import { AddressType } from "../models/Address/Type";
import { Client } from "../models/Client";
import { Ipv4Address } from "../models/Ipv4Address";
import { Ipv6Address } from "../models/Ipv6Address";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationStacks = async (options: Partial<Client.Options> | undefined, callback: (clients: [Client, Client]) => Promise<void> | void): Promise<void> => {
	const clients: Array<Client> = [];

	try {
		for (let clientIndex = 0; clientIndex < 2; clientIndex++) {
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
					isAddressValidationDisabled: true,
					isPrefixFilteringDisabled: true,
					socket: socket6,
				},
				[AddressType.IPv4]: {
					isAddressValidationDisabled: true,
					isPrefixFilteringDisabled: true,
					socket: socket4,
				},
				logger,
				...options,
			});

			const ipv6External = Ipv6Address.fromAddressInfo(socket6.address());
			const ipv4External = Ipv4Address.fromAddressInfo(socket4.address());

			const ipv6Channel = client.ipChannels[AddressType.IPv6];
			const ipv4Channel = client.ipChannels[AddressType.IPv4];

			if (ipv6Channel) {
				ipv6Channel.addressTracker.external = ipv6External;
				ipv6Channel.bindings.external = ipv6External;
			}
			if (ipv4Channel) {
				ipv4Channel.addressTracker.external = ipv4External;
				ipv4Channel.bindings.external = ipv4External;
			}

			clients.push(client);
		}

		for (const clientA of clients) {
			for (const clientB of clients) {
				if (clientA.diceAddress.toString() === clientB.diceAddress.toString()) continue;

				if (clientB.ipChannels[AddressType.IPv6]?.addressTracker.external) {
					clientA.ipChannels[AddressType.IPv6]?.coordinators.add(clientB.ipChannels[AddressType.IPv6].addressTracker.external);
				}
				if (clientB.ipChannels[AddressType.IPv4]?.addressTracker.external) {
					clientA.ipChannels[AddressType.IPv4]?.coordinators.add(clientB.ipChannels[AddressType.IPv4].addressTracker.external);
				}
			}

			clientA.open();
			clearInterval(clientA.ipChannels[AddressType.IPv6]?.healthcheckInterval);
			clearInterval(clientA.ipChannels[AddressType.IPv4]?.healthcheckInterval);
		}

		await callback(clients as [Client, Client]);
	} finally {
		for (const client of clients) {
			client.close();

			for (const ipChannel of Object.values(client.ipChannels)) {
				ipChannel.udpTransport.socket.close();
			}
		}
	}
};
