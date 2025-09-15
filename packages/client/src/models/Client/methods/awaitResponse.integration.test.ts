import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

it(
	"awaits response",
	async () => {
		await spawnIntegrationClients(undefined, async ([clientA, clientB]) => {
			const response = new Message({
				body: {
					type: MessageBodyType.PING_RESPONSE,
					reflectionAddress: clientB.endpoint.address!,
				},
			});

			clientA.sendAddress(clientB.endpoint.address!, response.buffer);

			const receivedResponse = await clientB.awaitResponse({
				source: {
					address: clientA.endpoint.address!,
				},
				body: {
					type: MessageBodyType.PING_RESPONSE,
				},
			});

			expect(receivedResponse).toBeDefined();
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
