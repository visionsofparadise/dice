import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Endpoint } from "../../Endpoint/Nat1";

it(
	"sends reflect",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const udpSocket = socketA.udpSockets[0]!;
			const target = { diceAddress: socketB.node.diceAddress, endpoint: socketB.node.endpoints[0] as Nat1Endpoint };

			const networkAddress = await socketA.reflect(udpSocket, target);

			expect(networkAddress.toString() === target.endpoint.networkAddress.toString()).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
