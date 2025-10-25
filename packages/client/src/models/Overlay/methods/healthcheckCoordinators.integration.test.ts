import { vi } from "vitest";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"removes unhealthy coordinators and finds new ones",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayA = clientA.overlays[AddressType.IPv4]!;

			clientB.close();

			expect(overlayA.coordinatorMap.size).toBe(1);

			const mockFindAddresses = vi.fn().mockResolvedValue([]);
			overlayA.findAddresses = mockFindAddresses;

			await overlayA.healthcheckCoordinators();
			expect(mockFindAddresses).toHaveBeenCalled();

			expect(overlayA.coordinatorMap.size).toBe(0);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
