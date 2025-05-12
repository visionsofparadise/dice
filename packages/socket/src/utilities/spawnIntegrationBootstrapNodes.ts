import log, { LogLevelNumbers } from "loglevel";
import { NatType } from "../models/Node/Constant";
import { Socket } from "../models/Socket";

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

export const spawnIntegrationBootstrapSockets = async (options?: Partial<Socket.Options>): Promise<Array<Socket>> => {
	const basePort = 8000;
	const sockets: Array<Socket> = [];

	for (let i = 0; i < 3; i++) {
		const socket = new Socket({
			bootstrapNodes: [],
			isPortMappingDisabled: true,
			// logger: log,
			natType: NatType.NAT1,
			port: basePort + i,
			...options,
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

	return sockets;
};
