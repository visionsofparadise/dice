import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"gets external networkAddress",
	async () => {
		await spawnIntegrationSocketPair(async (socketA) => {
			const { networkAddressA, networkAddressB } = await socketA.getExternalAddress(socketA.udpSockets[0]!);

			expect(networkAddressA.toString()).toBe("127.0.0.1:4000");
			expect(networkAddressA.toString() === networkAddressB.toString()).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
