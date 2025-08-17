import { spawnIntegrationBootstrapSockets } from "./spawnIntegrationBootstrapSockets";
import { INTEGRATION_TEST_TIMEOUT_MS } from "./spawnIntegrationSockets";

it(
	"spawns integration bootstraps nodes",
	async () => {
		await spawnIntegrationBootstrapSockets(undefined, async (bootstrapSockets) => {
			for (const socketA of bootstrapSockets) {
				expect(socketA.session.endpoint).toBeDefined();

				for (const socketB of bootstrapSockets) {
					if (socketA.session.endpoint?.key === socketB.session.endpoint?.key) continue;

					expect(socketA.session.cache.pool.has(socketB.session.endpoint!.address.key)).toBe(true);
				}
			}
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
