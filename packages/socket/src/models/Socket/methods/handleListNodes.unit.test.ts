import { Codec } from "bufferfy";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { NodeCodec } from "../../Node/Codec";

it("handles listNodes message", async () => {
	const socket = new Socket();

	const message = new Message({
		sourceNode: socket.node,
		targetNode: socket.node,
		body: {
			type: "listNodes",
			transactionId: createId(),
			publicKey: socket.keys.publicKey,
		},
	});

	const [response, address] = socket.handleListNodes(message);

	expect(response.body.code).toBe(ResponseCode.SUCCESS);
	expect(compare(message.body.transactionId, response.body.transactionId) === 0).toBe(true);
	expect(address).toBeUndefined();

	if (response.body.code !== ResponseCode.SUCCESS) throw new Error();

	const nodes = Codec.Array(NodeCodec).decode(response.body.body);

	expect(nodes.length).toBe(0);
});
