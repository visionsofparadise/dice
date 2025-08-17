import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";
import { Nat1Endpoint } from "../../Endpoint/Nat1";

it(
	"sends reflect",
	async () => {
		await spawnIntegrationSockets(undefined, async (_, [socketA, socketB]) => {
			const address = await socketA.session.reflect(socketB.session.endpoint as Nat1Endpoint);

			expect(address.key === socketA.session.endpoint!.address.key).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
