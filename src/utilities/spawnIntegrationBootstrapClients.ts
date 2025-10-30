import { createSocket } from "dgram";
import logger, { LogLevelNumbers } from "loglevel";
import { AddressType } from "../models/Address/Type";
import { Stack } from "../models/Stack";
import { Ipv4Address } from "../models/Ipv4Address";
import { Ipv6Address } from "../models/Ipv6Address";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export const spawnIntegrationBootstrapClients = async (options: Partial<Stack.Options> | undefined, callback: (stacks: [Stack, Stack, Stack]) => any): Promise<void> => {
	const stacks: Array<Stack> = [];

	try {
		for (let i = 0; i < 3; i++) {
			const socket6 = createSocket("udp6");

			await new Promise<void>((resolve) => {
				socket6.bind(undefined, "::1", () => resolve());
			});

			const socket4 = createSocket("udp4");

			await new Promise<void>((resolve) => {
				socket4.bind(undefined, "127.0.0.1", () => resolve());
			});

			const stack = new Stack({
				[AddressType.IPv6]: {
					bootstrapAddresses: [],
					isAddressValidationDisabled: true,
					isPrefixFilteringDisabled: true,
					socket: socket6,
				},
				[AddressType.IPv4]: {
					bootstrapAddresses: [],
					isAddressValidationDisabled: true,
					isPrefixFilteringDisabled: true,
					socket: socket4,
				},
				logger,
				...options,
			});

			const ipv6External = Ipv6Address.fromAddressInfo(socket6.address());
			const ipv4External = Ipv4Address.fromAddressInfo(socket4.address());

			stack.layers[AddressType.IPv6]!.addressState.external = ipv6External;
			stack.layers[AddressType.IPv6]!.bindings.external = ipv6External;
			stack.layers[AddressType.IPv4]!.addressState.external = ipv4External;
			stack.layers[AddressType.IPv4]!.bindings.external = ipv4External;

			stacks.push(stack);
		}

		for (const clientA of stacks) {
			for (const clientB of stacks) {
				if (clientA.diceAddress.toString() === clientB.diceAddress.toString()) continue;

				if (clientB.layers[AddressType.IPv6]?.addressState.external) {
					clientA.layers[AddressType.IPv6]?.coordinators.add(clientB.layers[AddressType.IPv6].addressState.external);
				}
				if (clientB.layers[AddressType.IPv4]?.addressState.external) {
					clientA.layers[AddressType.IPv4]?.coordinators.add(clientB.layers[AddressType.IPv4].addressState.external);
				}
			}

			await clientA.open();
			clearInterval(clientA.layers[AddressType.IPv6]?.healthcheckInterval);
			clearInterval(clientA.layers[AddressType.IPv4]?.healthcheckInterval);
		}

		await callback(stacks as [Stack, Stack, Stack]);
	} finally {
		for (const stack of stacks) {
			stack.close();

			for (const layer of Object.values(stack.layers)) {
				layer.adapter.socket.close();
			}
		}
	}
};
