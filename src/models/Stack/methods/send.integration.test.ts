import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { AddressType } from "../../Address/Type";
import { Message } from "../../Message";

it(
	"sends message to DiceAddress",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			const overlayB = clientB.layers[AddressType.IPv4]!;

			const testMessage = Message.mock();

			const promise = new Promise<void>((resolve) => {
				overlayB.events.on("diceMessage", (message) => {
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
