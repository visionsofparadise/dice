import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"finds addresses",
	async () => {
		await spawnIntegrationClients(undefined, async ([bootstrapClientA], [clientA, clientB]) => {
			const overlayA = clientA.overlays[AddressType.IPv4]!;
			const overlayB = clientB.overlays[AddressType.IPv4]!;
			const bootstrapOverlay = bootstrapClientA.overlays[AddressType.IPv4]!;

			bootstrapOverlay.coordinatorMap.set(overlayB.external!.key!, overlayB.external!);
			overlayA.coordinatorMap.clear();

			const foundAddresses = await overlayA.findAddresses(3);

			expect(foundAddresses.length).toBe(1);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
