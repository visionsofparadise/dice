import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Node } from "../../Node/Nat1";

it(
	"lists nodes",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();
		const bootstrapNodes = bootstrapSockets.map((socket) => socket.node as Nat1Node);

		const socketA = spawnIntegrationSocket({ bootstrapNodes, port: 4000 });
		const socketB = spawnIntegrationSocket({ bootstrapNodes, port: 4001 });

		try {
			socketA.open();
			socketB.open();

			await socketA.bootstrap();
			await socketB.bootstrap();

			const nodes = await socketA.listNodes(socketB.node, socketB.keys.publicKey);

			expect(nodes.length).toBe(1);
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
