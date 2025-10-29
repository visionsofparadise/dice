import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { createTransactionId } from "../../TransactionId/Codec";

it(
	"awaits response",
	async () => {
		await spawnIntegrationClients(undefined, async ([clientA, clientB]) => {
			const overlayA = clientA.layers[AddressType.IPv4]!;
			const overlayB = clientB.layers[AddressType.IPv4]!;

			const response = new Message({
				flags: {
					isNotCandidate: overlayA.isNotCandidate,
				},
				body: {
					type: MessageBodyType.PONG,
					transactionId: createTransactionId(),
					reflectionAddress: overlayB.external!,
				},
			});

			overlayA.send(overlayB.external!, response.buffer);

			const receivedResponse = await overlayB.correlator.awaitResponse({
				source: {
					address: overlayA.external!,
				},
				body: {
					type: MessageBodyType.PONG,
					transactionId: response.body.transactionId,
				},
			});

			expect(receivedResponse).toBeDefined();
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
