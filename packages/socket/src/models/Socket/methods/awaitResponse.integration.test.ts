import { createId } from "../../../utilities/Id";
import { spawnIntegrationBootstrapSockets } from "../../../utilities/spawnIntegrationBootstrapNodes";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocket } from "../../../utilities/spawnIntegrationSocket";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { Nat1Node } from "../../Node/Nat1";

it(
	"awaits response",
	async () => {
		const bootstrapSockets = await spawnIntegrationBootstrapSockets();
		const bootstrapNodes = bootstrapSockets.map((socket) => socket.node as Nat1Node);

		const socketA = spawnIntegrationSocket({ bootstrapNodes, port: 4000 });
		const socketB = spawnIntegrationSocket({ bootstrapNodes, port: 4001 });

		try {
			socketA.open();
			socketB.open();

			const ping = new Message({
				sourceNode: socketA.node,
				targetNode: socketB.node,
				body: {
					type: "ping",
					transactionId: createId(),
				},
			});

			await socketA.send(ping);

			const response = await socketA.awaitResponse(ping.body.transactionId);

			expect(response.body.code).toBe(ResponseCode.SUCCESS_NO_CONTENT);
		} finally {
			socketB.close();
			socketA.close();

			for (const socket of bootstrapSockets) socket.close();
		}
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
