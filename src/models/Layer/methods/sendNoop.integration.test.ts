import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";
import { MessageBodyType } from "../../Message/BodyCodec";

it(
	"sends noop",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.layers[AddressType.IPv4]!;
			const overlayB = clientB.layers[AddressType.IPv4]!;

			const promise = new Promise<void>((resolve) => {
				overlayB.events.on("diceMessage", (message) => {
					if (message.body.type === MessageBodyType.NOOP) {
						expect(message).toBeDefined();

						resolve();
					}
				});
			});

			await overlayA.noop(overlayB.addressState.external!);

			await promise;
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
