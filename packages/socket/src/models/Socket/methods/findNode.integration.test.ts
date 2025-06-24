import { compare } from "uint8array-tools";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"finds node",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const resultNode = await socketA.findNode(socketB.keys.diceAddress);

			expect(resultNode).toBeDefined();
			expect(compare(resultNode!.diceAddress, socketB.keys.diceAddress) === 0).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
