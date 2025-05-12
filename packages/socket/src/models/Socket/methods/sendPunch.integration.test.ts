import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { NatType } from "../../Node/Constant";
import { Nat1Node } from "../../Node/Nat1";
import { Nat3Node } from "../../Node/Nat3";

it(
	"sends punch",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();
		const bootstrapNodes = bootstrapSockets.map((socket) => socket.node as Nat1Node);

		const socketA = spawnIntegrationSocket({ bootstrapNodes, port: 4000 });
		const socketB = spawnIntegrationSocket({ bootstrapNodes, port: 4001, natType: NatType.NAT3 });

		socketB.node = Nat3Node.create(
			{
				address: socketB.node.address,
				relayNode: socketA.node as Nat1Node,
				sequenceNumber: 100,
			},
			socketB.keys
		);

		try {
			socketA.open();
			socketB.open();

			await socketA.bootstrap();
			await socketB.bootstrap();

			await socketA.punch(socketB.node);

			expect(true).toBe(true);
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
