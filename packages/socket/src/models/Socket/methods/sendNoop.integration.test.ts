import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Endpoint } from "../../Endpoint/Nat1";

it(
	"sends noop",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const udpSocket = socketA.udpSockets[0]!;

			await socketA.noop(udpSocket, { endpoint: socketB.node.endpoints[0] as Nat1Endpoint });

			await new Promise<void>((resolve) => {
				socketB.on("message", (request) => {
					if (request.body.type === "noop") {
						expect(request).toBeDefined();

						resolve();
					}
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
