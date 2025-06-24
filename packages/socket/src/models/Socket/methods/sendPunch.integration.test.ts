import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";
import { Nat3Endpoint } from "../../Endpoint/Nat3";

it(
	"sends punch",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const udpSocket = socketA.udpSockets[0]!;

			await socketA.punch(udpSocket, { diceAddress: socketB.node.diceAddress, endpoint: socketB.node.endpoints[0] as Nat3Endpoint });

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
