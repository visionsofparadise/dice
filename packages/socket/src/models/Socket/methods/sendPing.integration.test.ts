import { compare } from "uint8array-tools";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";

it(
	"sends ping",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const node = await socketA.ping(socketB.node);

			expect(compare(node.diceAddress, socketB.keys.diceAddress) === 0).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
