import { compare } from "uint8array-tools";
import { spawnIntegrationBootstrapSockets } from "./spawnIntegrationBootstrapSockets";
import { INTEGRATION_TEST_TIMEOUT_MS } from "./spawnIntegrationSocket";

it(
	"spawns integration bootstraps nodes",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();

		try {
			for (const socketA of bootstrapSockets) {
				expect(socketA.node.endpoints.length).toBe(1);

				for (const socketB of bootstrapSockets) {
					if (compare(socketA.node.diceAddress, socketB.node.diceAddress) === 0) continue;

					expect(socketA.overlay.table.has(socketA.overlay.table.getId(socketB.node))).toBe(true);
				}
			}
		} finally {
			for (const socket of bootstrapSockets) {
				socket.close();

				for (const udpSocket of socket.options.udpSockets) udpSocket.close();
			}
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
