import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";

it(
	"gets external address",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA]) => {
			const { addressA, addressB } = await socketA.session.getExternalAddress();

			expect(addressA.toString()).toBe(`127.0.0.1:${socketA.session.endpoint!.address.port}`);
			expect(addressA.toString() === addressB.toString()).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
