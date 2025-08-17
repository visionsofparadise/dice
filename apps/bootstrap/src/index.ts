import { Address, Nat, Nat1Endpoint, Socket } from "@xkore/dice";
import { program } from "commander";
import { createSocket, Socket as UdpSocket } from "dgram";
import dotenv from "dotenv";
import logger, { LogLevelNumbers } from "loglevel";
import { CommandOptions } from "./methods/CommandOptions";
import { optionalTransform } from "./methods/optionalTransform";

const crypto = require("crypto").webcrypto;
global.crypto = crypto;

dotenv.config();

type Options = CommandOptions<never, "cacheSize" | "concurrency" | "depth" | "ipv4" | "ipv6" | "logLevel" | "poolSize" | "ports">;

program
	.version("0.0.0", "-v, --vers", "output the current version")
	.option("-s, --cache-size <number>", "Size in bytes of cache")
	.option("-c, --concurrency <number>", "Concurrency of sample and relay operations")
	.option("-d, --depth <number>", "Depth of sample operations")
	.option("-4, --ipv4 <string>", "Ipv4 address")
	.option("-6, --ipv6 <string>", "Ipv6 address")
	.option("-l, --log-level <number>", "Log level 0-5, 0 being all logs")
	.option("-o, --pool-size <number>", "Count of addresses cached in pool")
	.option("-p, --ports <string>", "Comma separated list of ports");

const main = async () => {
	const options = program.parse().opts<Options>();

	const cacheSize = optionalTransform(options.cacheSize || process.env.CACHE_SIZE, (value) => parseInt(value)) || 10_000;
	const concurrency = optionalTransform(options.concurrency || process.env.CONCURRENCY, (value) => parseInt(value)) || 3;
	const depth = optionalTransform(options.depth || process.env.DEPTH, (value) => parseInt(value)) || 10;
	const ipv4 = optionalTransform(options.ipv4 || process.env.IPV4, (value) => value);
	const ipv6 = optionalTransform(options.ipv6 || process.env.IPV6, (value) => value);
	const logLevel = optionalTransform(options.logLevel || process.env.LOG_LEVEL, (value) => parseInt(value) as LogLevelNumbers) || 5;
	const poolSize = optionalTransform(options.poolSize || process.env.POOL_SIZE, (value) => parseInt(value)) || 100;
	const ports = optionalTransform(options.ports || process.env.PORTS, (value) => value.split(",").map((port) => parseInt(port))) || [5173];

	logger.setLevel(logLevel);
	logger.info(
		`[MAIN] Configuration:\n${JSON.stringify(
			{
				cacheSize,
				concurrency,
				depth,
				ipv4,
				ipv6,
				logLevel,
				poolSize,
				ports,
			},
			null,
			4
		)}`
	);

	const udpSockets: Array<UdpSocket> = [];

	if (ipv4) {
		for (const port of ports) {
			const udpSocket = createSocket("udp4");

			await new Promise<void>((resolve) => {
				udpSocket.bind(port, ipv4, () => resolve());
			});

			udpSockets.push(udpSocket);
		}
	} else if (ipv6) {
		for (const port of ports) {
			const udpSocket = createSocket("udp6");

			await new Promise<void>((resolve) => {
				udpSocket.bind(port, ipv6, () => resolve());
			});

			udpSockets.push(udpSocket);
		}
	}

	const sockets: Array<Socket> = [];

	for (const udpSocket of udpSockets) {
		const socket = new Socket({
			bootstrapAddresses: [],
			cacheSize,
			concurrency,
			depth,
			logger,
			poolSize,
			natType: Nat.NAT1,
			udpSocket,
		});

		socket.session.endpoint = new Nat1Endpoint({
			address: Address.fromRemoteInfo(udpSocket.address()),
		});

		sockets.push(socket);
	}

	for (const socketA of sockets) {
		for (const socketB of sockets) {
			socketA.session.cache.pool.set(socketB.session.endpoint!.address.key, socketB.session.endpoint!.address);
		}
	}

	await Promise.all(sockets.map((socket) => socket.open(false)));

	for (const socket of sockets) {
		logger.info(`[MAIN]: ${socket.session.endpoint!.address.toString()}`);
	}
};

main();
