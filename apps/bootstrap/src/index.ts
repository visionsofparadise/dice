import { base58, hex } from "@scure/base";
import { IpType, Keys, NatType, Socket } from "@xkore/dice";
import "dotenv/config";
import log, { LogLevelNumbers } from "loglevel";
import { getGeneration } from "./getGeneration";

const crypto = require("crypto").webcrypto;
global.crypto = crypto;

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

if (!process.env.PRIVATE_KEYS) throw new Error("Private keys not configured");

const privateKeys = process.env.PRIVATE_KEYS.split(",").map((privateKey) => base58.decode(privateKey));

if (!privateKeys.length) throw new Error("Invalid private keys count");
if (!process.env.IP_TYPES) throw new Error("Ip types not configured");

const ipTypes = process.env.IP_TYPES.split(",") as Array<IpType>;

if (ipTypes.length !== privateKeys.length) throw new Error("Invalid ip types count");
if (!process.env.IPS) throw new Error("Ips not configured");

const ips = process.env.IPS.split(",");

if (ips.length !== privateKeys.length) throw new Error("Invalid ips count");
if (!process.env.PORTS) throw new Error("Ports not configured");

const ports = process.env.PORTS.split(",").map((port) => parseInt(port));

if (ports.length !== privateKeys.length) throw new Error("Invalid ports count");

const configurations: Array<{ privateKey: Uint8Array; ipType: IpType; ip: string; port: number }> = [];

for (let i = 0; i < privateKeys.length; i++) {
	const privateKey = privateKeys[i];
	const ipType = ipTypes[i];
	const ip = ips[i];
	const port = ports[i];

	if (!privateKey || !ipType || !ip || !port) throw new Error("Invalid configuration");

	configurations.push({
		privateKey,
		ipType,
		ip,
		port,
	});
}

const sockets: Array<Socket> = [];

for (const configuration of configurations) {
	const keys = new Keys(configuration);

	const generation = getGeneration(keys.publicKey);

	const socket = new Socket({
		bootstrapNodes: [],
		generation,
		ip: {
			type: configuration.ipType,
			value: configuration.ip,
		},
		isPortMappingDisabled: true,
		// logger: log,
		natType: NatType.NAT1,
		port: configuration.port,
		privateKey: configuration.privateKey,
	});

	socket.node = socket.node.update(
		{
			isDisabled: false,
		},
		socket.keys
	);

	sockets.push(socket);
}

for (const socketA of sockets) {
	for (const socketB of sockets) {
		socketA.overlay.put(socketB.node);
	}

	socketA.open();
}

for (const socket of sockets) {
	log.info(`Bootstrap Node ${base58.encode(socket.keys.publicKey)}`);
	log.info(`Address: ${socket.node.address.toString()}`);
	log.info(`Sequence Number: ${socket.node.sequenceNumber}`);
	log.info(`Generation: ${socket.node.generation}`);
	log.info(`Signature: ${hex.encode(socket.node.rSignature.signature)}`);
	log.info(`R: ${socket.node.rSignature.r}`);
	log.info("\n");
}
