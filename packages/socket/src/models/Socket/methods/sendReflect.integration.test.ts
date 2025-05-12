import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Node } from "../../Node/Nat1";

it(
	"sends reflect",
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

			const address = await socketA.reflect(socketB.node as Nat1Node);

			expect(address.toString() === socketA.node.address.toString()).toBe(true);
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
