import { base32crockford, base64 } from "@scure/base";
import { IpFamily, Nat, Nat1Endpoint, NetworkAddress, Socket } from "@xkore/dice";
import { createSocket } from "dgram";
import "dotenv/config";
import log, { LogLevelNumbers } from "loglevel";

const crypto = require("crypto").webcrypto;
global.crypto = crypto;

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

if (!process.env.PRIVATE_KEYS) throw new Error("Private keys not configured");

const privateKeys = process.env.PRIVATE_KEYS.split(",").map((privateKey) => base64.decode(privateKey));

if (!privateKeys.length) throw new Error("Invalid private keys count");
if (!process.env.ADDRESSES) throw new Error("Addresses not configured");

const addresses = process.env.ADDRESSES.split(",");

if (addresses.length !== privateKeys.length) throw new Error("Invalid addresses count");
if (!process.env.PORTS) throw new Error("Ports not configured");

const ports = process.env.PORTS.split(",").map((port) => parseInt(port));

if (ports.length !== privateKeys.length) throw new Error("Invalid ports count");

const configurations: Array<{ privateKey: Uint8Array; address: string; port: number }> = [];

const main = async () => {
	for (let i = 0; i < privateKeys.length; i++) {
		const privateKey = privateKeys[i];
		const address = addresses[i];
		const port = ports[i];

		if (!privateKey || !address || !port) throw new Error("Invalid configuration");

		configurations.push({
			address,
			port,
			privateKey,
		});
	}

	const sockets: Array<Socket> = [];

	for (const configuration of configurations) {
		// const keys = new Keys(configuration);

		const generation = 0; // getGeneration(keys.publicKey);

		const udpSocket = createSocket("udp4");

		await new Promise<void>((resolve) => {
			udpSocket.bind(configuration.port, configuration.address, () => resolve());
		});

		const socket = new Socket({
			bootstrapNodes: [],
			generation,
			// logger: log,
			natType: Nat.NAT1,
			privateKey: configuration.privateKey,
			udpSockets: [udpSocket],
		});

		const endpoint = new Nat1Endpoint({
			networkAddress: new NetworkAddress({
				family: IpFamily.IPv4,
				address: configuration.address,
				port: configuration.port,
			}),
		});

		socket.externalUdpSocketMap.set(endpoint.key, udpSocket);
		socket.internalEndpointMap.set(NetworkAddress.fromRemoteInfo(udpSocket.address()).toString(), endpoint);
		socket.node = socket.node.update(
			{
				endpoints: [endpoint],
			},
			socket.keys
		);

		sockets.push(socket);
	}

	for (const socketA of sockets) {
		for (const socketB of sockets) {
			socketA.overlay.put(socketB.node);
		}

		socketA.open(false);
	}

	for (let i = 0; i < sockets.length; i++) {
		const socket = sockets[i]!;

		log.info(`Bootstrap Node ${i}`);
		log.debug(`Private Key: ${base64.encode(socket.options.privateKey)}`);
		log.info(`Dice Address: ${base32crockford.encode(socket.keys.diceAddress)}`);
		log.info(`Sequence Number: ${socket.node.sequenceNumber}`);
		log.info(`Generation: ${socket.node.generation}`);
		log.info(`Recovery Bit: ${socket.node.rSignature.recoveryBit}`);
		log.info(`Signature: ${base64.encode(socket.node.rSignature.signature)}`);
		log.debug("Endpoints:");
		for (const endpoint of socket.node.endpoints) {
			log.info(`	Network Address: ${endpoint.networkAddress.toString()}`);
		}
		log.info("");
	}
};

main();
