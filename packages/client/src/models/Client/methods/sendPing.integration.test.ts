import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";

it(
	"sends ping",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			await clientA.ping(clientB.endpoint.address!);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
