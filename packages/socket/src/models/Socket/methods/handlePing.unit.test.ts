import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

it("handles ping message", async () => {
	const socket = new Socket();

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "ping",
				transactionId: createId(),
			},
		},
		socket.keys
	);

	try {
		await socket.handlePing(request);
	} catch (error) {
		if (error instanceof DiceError) {
			expect(error.message).toBe("Cannot find arc for pingResponse");
		}
	}
});
