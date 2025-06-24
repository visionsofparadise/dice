import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";
import { Message } from "../../Message";

it("handles punch message", async () => {
	const socket = new Socket();

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "punch",
				transactionId: createId(),
				endpoint: Nat1Endpoint.mock(),
			},
		},
		socket.keys
	);

	const context = {
		local: {},
	} as any;

	try {
		await socket.handlePunch(request, context);
	} catch (error) {
		if (error instanceof DiceError) {
			expect(error.message).toBe("Socket is closed");
		}
	}
});
