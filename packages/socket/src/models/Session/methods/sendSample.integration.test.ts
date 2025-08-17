import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";

it(
	"samples endpoints",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA, socketB]) => {
			const endpoints = await socketA.session.sample(socketB.session.endpoint!);

			expect(endpoints.length).toBe(0);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
