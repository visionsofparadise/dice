import { compare } from "uint8array-tools";
import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { AddressCodec } from "../../Address/Codec";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";

it("handles reflect message", async () => {
	const socket = new Socket();

	const message = new Message({
		sourceNode: socket.node,
		targetNode: socket.node,
		body: {
			type: "reflect",
			transactionId: createId(),
		},
	});

	const [response, address] = socket.handleReflect(message, socket.node.address.toRemoteInfo(message.byteLength));

	expect(response.body.code).toBe(ResponseCode.SUCCESS);
	expect(compare(message.body.transactionId, response.body.transactionId) === 0).toBe(true);
	expect(address.toString() === socket.node.address.toString()).toBe(true);

	if (response.body.code !== ResponseCode.SUCCESS) throw new Error();

	const responseAddress = AddressCodec.decode(response.body.body);

	expect(responseAddress.toString() === socket.node.address.toString()).toBe(true);
});
