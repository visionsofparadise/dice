import { NatType } from "../models/Node/Constant";
import { spawnIntegrationBootstrapSockets } from "./spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS } from "./spawnIntegrationSocket";

it(
	"spawns integration bootstraps nodes",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();

		try {
			for (const socketA of bootstrapSockets) {
				expect(socketA.node.isDisabled).toBe(false);
				expect(socketA.node.natType).toBe(NatType.NAT1);

				for (const socketB of bootstrapSockets) {
					if (socketA.node.isEqualPublicKey(socketB.node)) continue;

					expect(socketA.overlay.table.has(socketA.overlay.table.getId(socketB.node))).toBe(true);
				}
			}
		} finally {
			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
