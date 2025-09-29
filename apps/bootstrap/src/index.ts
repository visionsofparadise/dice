import { AddressType, Client, Ipv4Address, Ipv6Address, Overlay } from "@xkore/dice";
import { program } from "commander";
import { createSocket } from "dgram";
import dotenv from "dotenv";
import logger, { LogLevelNumbers } from "loglevel";
import { CommandOptions } from "./methods/CommandOptions";
import { optionalTransform } from "./methods/optionalTransform";

const crypto = require("crypto").webcrypto;
global.crypto = crypto;

dotenv.config();

type Options = CommandOptions<never, "cacheSize" | "ipv4" | "ipv6" | "logLevel" | "ports">;

program
	.version("0.0.0", "-v, --vers", "output the current version")
	.option("-s, --cache-size <number>", "Size in bytes of cache")
	.option("-4, --ipv4 <string>", "Ipv4 address")
	.option("-6, --ipv6 <string>", "Ipv6 address")
	.option("-l, --log-level <number>", "Log level 0-5, 0 being all logs")
	.option("-p, --ports <string>", "Comma separated list of ports");

const main = async () => {
	const options = program.parse().opts<Options>();

	const cacheSize = optionalTransform(options.cacheSize || process.env.CACHE_SIZE, (value) => parseInt(value)) || 10_000;
	const ipv4 = optionalTransform(options.ipv4 || process.env.IPV4, (value) => value);
	const ipv6 = optionalTransform(options.ipv6 || process.env.IPV6, (value) => value);
	const logLevel = optionalTransform(options.logLevel || process.env.LOG_LEVEL, (value) => parseInt(value) as LogLevelNumbers) || 5;
	const ports = optionalTransform(options.ports || process.env.PORTS, (value) => value.split(",").map((port) => parseInt(port))) || [5173];

	logger.setLevel(logLevel);
	logger.info(
		`[MAIN] Configuration:\n${JSON.stringify(
			{
				cacheSize,
				ipv4,
				ipv6,
				logLevel,
				ports,
			},
			null,
			4
		)}`
	);

	const socketPairs: Array<Partial<Record<AddressType, Overlay.Socket>>> = [];

	for (const port of ports) {
		const socketPair: Partial<Record<AddressType, Overlay.Socket>> = {};

		if (ipv4) {
			const socket = createSocket("udp4");

			await new Promise<void>((resolve) => {
				socket.bind(port, ipv4, () => resolve());
			});

			socketPair[AddressType.IPv4] = socket;
		}

		if (ipv6) {
			const socket = createSocket("udp6");

			await new Promise<void>((resolve) => {
				socket.bind(port, ipv6, () => resolve());
			});

			socketPair[AddressType.IPv6] = socket;
		}

		socketPairs.push(socketPair);
	}

	const clients: Array<Client> = [];

	for (const socketPair of socketPairs) {
		const client = new Client({
			[AddressType.IPv6]: {
				bootstrapAddresses: [],
				isPrefixFilteringDisabled: true,
				socket: socketPair[AddressType.IPv6],
			},
			[AddressType.IPv4]: {
				bootstrapAddresses: [],
				isPrefixFilteringDisabled: true,
				socket: socketPair[AddressType.IPv4],
			},
			cacheSize,
			logger,
		});

		client.overlays[AddressType.IPv6]!.external = Ipv6Address.fromAddressInfo(socketPair[AddressType.IPv6].address());
		client.overlays[AddressType.IPv4]!.external = Ipv4Address.fromAddressInfo(socketPair[AddressType.IPv4].address());
		clients.push(client);
	}

	for (const clientA of clients) {
		for (const clientB of clients) {
			if (clientA.diceAddress.toString() === clientB.diceAddress.toString()) continue;

			clientA.overlays[AddressType.IPv6]?.coordinatorMap.set(clientB.overlays[AddressType.IPv6]?.external!.key!, clientB.overlays[AddressType.IPv6]?.external!);
			clientA.overlays[AddressType.IPv4]?.coordinatorMap.set(clientB.overlays[AddressType.IPv4]?.external!.key!, clientB.overlays[AddressType.IPv4]?.external!);
		}

		await clientA.open(false);
	}

	for (const client of clients) {
		logger.info(`[MAIN]: ${client.diceAddress.toString()}`);
	}
};

main();
