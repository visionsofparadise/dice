import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"lists nodes",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const nodes = await socketA.listNodes(socketB.node, socketB.keys.diceAddress);

			expect(nodes.length).toBe(1);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
