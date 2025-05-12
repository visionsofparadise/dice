import { compare } from "uint8array-tools";
import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Node } from "../../Node/Nat1";

it(
	"sends data",
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

			const data = crypto.getRandomValues(new Uint8Array(512));

			await socketA.putData(socketB.node, data);

			await new Promise<void>((resolve) => {
				socketB.on("data", (requestData) => {
					expect(compare(data, requestData) === 0).toBe(true);

					resolve();
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
