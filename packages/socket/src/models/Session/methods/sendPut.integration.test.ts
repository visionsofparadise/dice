import { compare } from "uint8array-tools";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";

it(
	"sends data",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA, socketB]) => {
			const data = crypto.getRandomValues(new Uint8Array(512));

			await socketA.session.put(socketB.session.endpoint!, data);

			await new Promise<void>((resolve) => {
				socketB.session.events.on("data", (requestData) => {
					expect(compare(data, requestData) === 0).toBe(true);

					resolve();
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
