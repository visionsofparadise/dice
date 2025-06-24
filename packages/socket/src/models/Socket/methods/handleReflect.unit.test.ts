import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { NetworkAddress } from "../../NetworkAddress";

it("handles reflect message", async () => {
	const socket = new Socket();

	const request = Message.create(
		{
			node: socket.node,
			body: {
				type: "reflect",
				transactionId: createId(),
			},
		},
		socket.keys
	);

	const context = {
		local: {},
		remote: {
			networkAddress: NetworkAddress.mock(),
		},
	} as any;

	try {
		await socket.handleReflect(request, context);
	} catch (error) {
		if (error instanceof DiceError) {
			expect(error.message).toBe("Socket is closed");
		}
	}
});
