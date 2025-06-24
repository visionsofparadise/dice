import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

it("handles listNodes message", async () => {
	const socket = new Socket();

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "listNodes",
				transactionId: createId(),
				diceAddress: socket.node.diceAddress,
			},
		},
		socket.keys
	);

	try {
		await socket.handleListNodes(request);
	} catch (error) {
		if (error instanceof DiceError) {
			expect(error.message).toBe("Cannot find arc for listNodesResponse");
		}
	}
});
