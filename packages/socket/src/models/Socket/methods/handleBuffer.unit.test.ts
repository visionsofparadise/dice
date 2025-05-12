import { compare } from "uint8array-tools";
import { Socket } from "..";
import { Message } from "../../Message";

it("handles buffer", async () => {
	expect.assertions(1);

	const socket = new Socket();

	const message = new Message({
		sourceNode: socket.node,
		targetNode: socket.node,
		body: {
			type: "noop",
		},
	});

	socket.on("message", (receivedMessage) => {
		expect(compare(message.buffer, receivedMessage.buffer) === 0).toBe(true);
	});

	await socket.handleBuffer(message.buffer, socket.node.address.toRemoteInfo(message.byteLength));
});
