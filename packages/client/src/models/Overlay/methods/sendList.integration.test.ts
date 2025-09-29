import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"lists addresses",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.overlays[AddressType.IPv4]!;
			const overlayB = clientB.overlays[AddressType.IPv4]!;

			const addresses = await overlayA.list(overlayB.external!);

			expect(addresses.length).toBe(1);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
