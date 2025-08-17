import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";

it(
	"sends noop",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA, socketB]) => {
			await socketA.session.noop(socketB.session.endpoint!.address);

			await new Promise<void>((resolve) => {
				socketB.session.events.on("message", (request) => {
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
