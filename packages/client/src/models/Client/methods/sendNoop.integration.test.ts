import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationClients } from "../../../utilities/spawnIntegrationClients";
import { MessageBodyType } from "../../Message/BodyCodec";

it(
	"sends noop",
	async () => {
		await spawnIntegrationClients(undefined, async (_, [clientA, clientB]) => {
			await clientA.noop(clientB.endpoint.address!);

			await new Promise<void>((resolve) => {
				clientB.events.on("message", (request) => {
					if (request.body.type === MessageBodyType.NOOP) {
						expect(request).toBeDefined();

						resolve();
					}
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
