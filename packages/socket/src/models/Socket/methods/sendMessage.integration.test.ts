import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat } from "../../Endpoint/Constant";
import { Message } from "../../Message";

it(
	"sends message",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const arc = Endpoint.getArc(socketA.node.endpoints, socketB.node.endpoints);

			if (!arc || arc.target.endpoint.nat === Nat.NAT4) throw new Error();

			const message = Message.create(
				{
					node: socketA.node,
					body: {
						type: "noop",
					},
				},
				socketA.keys
			);

			await socketA.send(arc.source, { endpoint: arc.target.endpoint }, message);

			await new Promise<void>((resolve) => {
				socketB.on("message", (request) => {
					if (request.body.type === "noop") {
						expect(request).toBeDefined();

						resolve();
					}
				});
			});
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
