import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Nat1Node } from "../../Node/Nat1";

it(
	"gets external address",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();
		const bootstrapNodes = bootstrapSockets.map((socket) => socket.node as Nat1Node);

		const socketA = spawnIntegrationSocket({ bootstrapNodes, port: 4000 });

		try {
			socketA.open();

			const { addressA, addressB } = await socketA.getExternalAddress();

			expect(addressA.toString()).toBe(socketA.node.address.toString());
			expect(addressA.toString() === addressB.toString()).toBe(true);
		} finally {
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
