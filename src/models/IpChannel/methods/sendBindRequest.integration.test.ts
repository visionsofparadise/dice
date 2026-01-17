import { expect, it } from "vitest";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationStacks } from "../../../utilities/spawnIntegrationStacks";
import { AddressType } from "../../Address/Type";

it(
	"sends bind request",
	async () => {
		await spawnIntegrationStacks(undefined, async ([clientA, clientB]) => {
			const ipChannelA = clientA.ipChannels[AddressType.IPv4]!;

			const diceAddress = clientB.diceAddress;

			await ipChannelA.protocol.requestBind(
				diceAddress[AddressType.IPv4]?.address!,
				[clientA, clientB].map((client) => client.ipChannels[AddressType.IPv4]?.addressTracker.external!),
			);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS,
);
