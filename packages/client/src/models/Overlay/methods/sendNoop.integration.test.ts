import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";
import { MessageBodyType } from "../../Message/BodyCodec";

it(
	"sends noop",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.overlays[AddressType.IPv4]!;
			const overlayB = clientB.overlays[AddressType.IPv4]!;

			await overlayA.noop(overlayB.external!);

			await new Promise<void>((resolve) => {
				overlayB.events.on("message", (request) => {
					if (request.body.type === MessageBodyType.NOOP) {
						expect(request).toBeDefined();

						resolve();
					}
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
