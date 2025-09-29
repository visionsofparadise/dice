import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"removes unhealthy candidates",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.overlays[AddressType.IPv4]!;
			const overlayB = clientB.overlays[AddressType.IPv4]!;

			overlayA.candidateMap.set(overlayB.external!.key, overlayB.external!);
			clientB.close();

			expect(overlayA.candidateMap.size).toBe(1);

			await overlayA.healthcheckCandidates();

			// Unhealthy candidate should be removed
			expect(overlayA.candidateMap.size).toBe(0);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
