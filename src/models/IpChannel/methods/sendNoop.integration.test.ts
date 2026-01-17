import { describe, expect, it } from "vitest";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationStacks } from "../../../utilities/spawnIntegrationStacks";
import { AddressType } from "../../Address/Type";
import { MessageBodyType } from "../../Message/BodyCodec";

describe("sends noop", () => {
	it(
		"sends via IPv4",
		async () => {
			await spawnIntegrationStacks(undefined, async ([clientA, clientB]) => {
				const ipChannelA = clientA.ipChannels[AddressType.IPv4]!;
				const ipChannelB = clientB.ipChannels[AddressType.IPv4]!;

				const promise = new Promise<void>((resolve) => {
					ipChannelB.udpTransport.events.on("diceMessage", (message) => {
						if (message.body.type === MessageBodyType.NOOP) {
							expect(message).toBeDefined();

							resolve();
						}
					});
				});

				await ipChannelA.protocol.noop(ipChannelB.addressTracker.external!);

				await promise;
			});
		},
		INTEGRATION_TEST_TIMEOUT_MS
	);
});
