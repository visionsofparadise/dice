import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"bootstraps nodes",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			expect(socketA.node.endpoints.length).toBe(1);
			expect(socketA.node.endpoints.length).toBe(1);

			await socketA.bootstrap();
			await socketB.bootstrap();
			await socketA.bootstrap();

			expect(socketA.overlay.table.has(socketB.keys.diceAddress)).toBe(true);
			expect(socketB.overlay.table.has(socketA.keys.diceAddress)).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
