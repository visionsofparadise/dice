import { createId } from "../../../utilities/Id";
import { INTEGRATION_TEST_TIMEOUT_MS, spawnIntegrationSocketPair } from "../../../utilities/spawnIntegrationSocket";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat } from "../../Endpoint/Constant";
import { Message } from "../../Message";

it(
	"awaits response",
	async () => {
		await spawnIntegrationSocketPair(async (socketA, socketB) => {
			const arc = Endpoint.getArc(socketA.node.endpoints, socketB.node.endpoints);

			if (!arc || arc.source.endpoint.nat !== Nat.NAT1 || arc.target.endpoint.nat !== Nat.NAT1) throw new Error();

			const response = Message.create(
				{
					node: socketA.node,
					body: {
						type: "reflectResponse",
						transactionId: createId(),
						networkAddress: arc.source.endpoint.networkAddress,
					},
				},
				socketA.keys
			);

			await socketA.send(arc.source, { endpoint: arc.target.endpoint }, response);

			const receivedResponse = await socketB.awaitResponse(response);

			expect(receivedResponse).toBeDefined();
		});
	},
	INTEGRATION_TEST_TIMEOUT_MS
);
