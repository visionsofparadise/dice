import { AddressType } from "../models/Address/Type";
import { spawnIntegrationBootstrapClients } from "./spawnIntegrationBootstrapClients";
import { INTEGRATION_TEST_TIMEOUT_MS } from "./spawnIntegrationClients";

it(
	"spawns integration bootstraps clients",
	async () => {
		await spawnIntegrationBootstrapClients(undefined, async (bootstrapClients) => {
			for (const clientA of bootstrapClients) {
				for (const clientB of bootstrapClients) {
					if (clientA.diceAddress.toString() === clientB.diceAddress.toString()) continue;

					expect(clientA.diceAddress[AddressType.IPv4]?.coordinators!.some((address) => address.key === clientB.diceAddress[AddressType.IPv4]!.address!.key)).toBe(true);
				}
			}
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
