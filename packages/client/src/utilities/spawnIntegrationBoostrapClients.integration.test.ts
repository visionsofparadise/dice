import { spawnIntegrationBootstrapClients } from "./spawnIntegrationBootstrapClients";
import { INTEGRATION_TEST_TIMEOUT_MS } from "./spawnIntegrationClients";

it(
	"spawns integration bootstraps clients",
	async () => {
		await spawnIntegrationBootstrapClients(undefined, async (bootstrapClients) => {
			for (const clientA of bootstrapClients) {
				expect(clientA.endpoint).toBeDefined();

				for (const clientB of bootstrapClients) {
					if (clientA.endpoint.key === clientB.endpoint.key) continue;

					expect(clientA.endpoint.relayAddresses.some((address) => address.key === clientB.endpoint.address!.key)).toBe(true);
				}
			}
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
