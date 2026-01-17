import { expect, it } from "vitest";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationStacks } from "../../../utilities/spawnIntegrationStacks";
import { AddressType } from "../../Address/Type";

it(
	"sends ping",
	async () => {
		await spawnIntegrationStacks(undefined, async ([clientA, clientB]) => {
			const ipChannelA = clientA.ipChannels[AddressType.IPv4]!;
			const ipChannelB = clientB.ipChannels[AddressType.IPv4]!;

			await ipChannelA.protocol.ping(ipChannelB.addressTracker.external!);

			expect(true).toBe(true);
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS,
);
