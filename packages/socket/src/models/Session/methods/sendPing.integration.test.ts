import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";

it(
	"sends ping",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA, socketB]) => {
			await socketA.session.ping(socketB.session.endpoint!);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
