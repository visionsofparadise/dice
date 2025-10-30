import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"sends ping",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.layers[AddressType.IPv4]!;
			const overlayB = clientB.layers[AddressType.IPv4]!;

			await overlayA.ping(overlayB.external!);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
