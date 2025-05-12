import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Node } from "../../Node/Nat1";

it(
	"bootstraps nodes",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();
		const bootstrapNodes = bootstrapSockets.map((socket) => socket.node as Nat1Node);

		const socketA = spawnIntegrationSocket({ bootstrapNodes, port: 4000 });
		const socketB = spawnIntegrationSocket({ bootstrapNodes, port: 4001 });

		try {
			socketA.open();
			socketB.open();

			await socketA.bootstrap();

			expect(socketA.node.isDisabled).toBe(false);

			await socketB.bootstrap();

			expect(socketA.node.isDisabled).toBe(false);

			await socketA.bootstrap();

			expect(socketA.overlay.table.has(socketB.keys.publicKey)).toBe(true);
			expect(socketB.overlay.table.has(socketA.keys.publicKey)).toBe(true);
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
