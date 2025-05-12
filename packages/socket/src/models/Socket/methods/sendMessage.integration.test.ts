import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Message } from "../../Message";
import { Nat1Node } from "../../Node/Nat1";

it(
	"sends message",
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

			const message = new Message({
				sourceNode: socketA.node,
				targetNode: socketB.node,
				body: {
					type: "noop",
				},
			});

			await socketA.send(message);

			await new Promise<void>((resolve) => {
				socketB.on("message", (request) => {
					if (request.body.type === "noop" && request.sourceNode.isEqualPublicKey(socketA.node)) {
						expect(request).toBeDefined();

						resolve();
					}
				});
			});
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
