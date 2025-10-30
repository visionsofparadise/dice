import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";

it(
	"sends bind request",
	async () => {
		await spawnIntegrationClients(undefined, async (bootstrapClients, [clientA, clientB]) => {
			const overlayA = clientA.layers[AddressType.IPv4]!;

			const diceAddress = clientB.diceAddress;

			await overlayA.requestBind(
				diceAddress[AddressType.IPv4]?.address!,
				bootstrapClients.map((stack) => stack.layers[AddressType.IPv4]?.external!)
			);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
