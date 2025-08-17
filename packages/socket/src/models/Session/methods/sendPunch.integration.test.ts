import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";
import { Nat3Endpoint } from "../../Endpoint/Nat3";

it(
	"sends punch",
	async () => {
		await spawnIntegrationSockets(undefined, async (bootstrapSockets, [socketA, socketB]) => {
			const nat3Endpoint = new Nat3Endpoint({
				address: socketB.session.endpoint!.address,
				relayAddresses: bootstrapSockets.map((socket) => socket.session.endpoint!.address),
			});

			await socketA.session.punch(nat3Endpoint);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
