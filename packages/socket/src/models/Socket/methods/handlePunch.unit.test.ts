import { compare } from "uint8array-tools";
import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";

it("handles punch message", async () => {
	const socket = new Socket();

	const message = new Message({
		sourceNode: socket.node,
		targetNode: socket.node,
		body: {
			type: "punch",
			transactionId: createId(),
		},
	});

	const result = socket.handlePunch(message);

	if (!result) throw new Error();

	const [response, address] = result;

	expect(response.body.code).toBe(ResponseCode.SUCCESS_NO_CONTENT);
	expect(compare(message.body.transactionId, response.body.transactionId) === 0).toBe(true);
	expect(address.toString() === socket.node.address.toString()).toBe(true);
});
