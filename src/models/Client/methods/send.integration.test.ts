import { describe, expect, it } from "vitest";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationStacks } from "../../../utilities/spawnIntegrationStacks";
import { AddressType } from "../../Address/Type";
import { Message } from "../../Message";

describe("sends message to DiceAddress", () => {
	it(
		"sends via IPv4",
		async () => {
			await spawnIntegrationStacks(undefined, async ([clientA, clientB]) => {
				const ipChannelB = clientB.ipChannels[AddressType.IPv4]!;

				const testMessage = Message.mock();

				const promise = new Promise<void>((resolve) => {
					ipChannelB.udpTransport.events.on("diceMessage", (message) => {
						if (message.buffer.every((byte, index) => byte === testMessage.buffer[index])) {
							expect(true).toBe(true);

							resolve();
						}
					});
				});

				await clientA.send(clientB.diceAddress, testMessage.buffer, AddressType.IPv4);

				await promise;
			});
		},
		INTEGRATION_TEST_TIMEOUT_MS
	);
});
