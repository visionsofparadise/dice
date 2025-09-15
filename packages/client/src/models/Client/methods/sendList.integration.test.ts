import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";

it(
	"lists addresses",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const addresses = await clientA.list(clientB.endpoint.address!);

			expect(addresses.length).toBe(1);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
