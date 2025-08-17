import { createId } from "../../../utilities/Id";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSockets } from "../../../utilities/spawnIntegrationSockets";
import { Message } from "../../Message";

it(
	"awaits response",
	async () => {
		await spawnIntegrationSockets(undefined, async ([socketA, socketB]) => {
			const response = new Message({
				body: {
					type: "reflectResponse",
					transactionId: createId(),
					address: socketB.session.endpoint!.address,
				},
			});

			socketA.session.sendUdpMessage(socketB.session.endpoint!.address, response);

			const receivedResponse = await socketB.session.awaitResponse({
				source: socketA.session.endpoint,
				body: {
					type: "reflectResponse",
					transactionId: response.body.transactionId,
				},
			});

			expect(receivedResponse).toBeDefined();
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
