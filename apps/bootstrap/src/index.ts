import { Address, Client, Endpoint } from "@xkore/dice";
import { program } from "commander";
import { createSocket, Socket } from "dgram";
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

	const sockets: Array<Socket> = [];

	if (ipv4) {
		for (const port of ports) {
			const socket = createSocket("udp4");

			await new Promise<void>((resolve) => {
				socket.bind(port, ipv4, () => resolve());
			});

			sockets.push(socket);
		}
	} else if (ipv6) {
		for (const port of ports) {
			const socket = createSocket("udp6");

			await new Promise<void>((resolve) => {
				socket.bind(port, ipv6, () => resolve());
			});

			sockets.push(socket);
		}
	}

	const clients: Array<Client> = [];

	for (const socket of sockets) {
		const client = new Client({
			bootstrapAddresses: [],
			cacheSize,
			logger,
			socket,
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
	}

	for (const client of clients) {
		logger.info(`[MAIN]: ${client.endpoint.address!.toString()}`);
	}
};

main();
