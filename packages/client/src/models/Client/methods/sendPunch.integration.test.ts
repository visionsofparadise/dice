import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { Endpoint } from "../../Endpoint";

it(
	"sends punch",
	async () => {
		await spawnIntegrationClients(undefined, async (bootstrapClients, [clientA, clientB]) => {
			const endpoint = new Endpoint({
				address: clientB.endpoint.address,
				relayAddresses: bootstrapClients.map((client) => client.endpoint.address!),
			});

			await clientA.punch(endpoint);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
