import { compare } from "uint8array-tools";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"sends data",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const data = crypto.getRandomValues(new Uint8Array(512));

			await socketA.putData(socketB.node, data);

			await new Promise<void>((resolve) => {
				socketB.on("data", (requestData) => {
					expect(compare(data, requestData) === 0).toBe(true);

					resolve();
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
