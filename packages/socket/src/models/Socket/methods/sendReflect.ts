import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Address } from "../../Address";
import { AddressCodec } from "../../Address/Codec";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { Nat1Node } from "../../Node/Nat1";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export const sendSocketReflect = async (socket: Socket, targetNode: Nat1Node, properties?: Partial<Message.Properties<"reflect">>, options?: AwaitSocketResponseOptions): Promise<Address> => {
	const request = new Message({
		...properties,
		sourceNode: socket.node,
		targetNode,
		body: {
			type: "reflect",
			transactionId: createId(),
		},
	});

	await socket.send(request);

	const response = await socket.awaitResponse(request.body.transactionId, options);

	if (response.body.code !== ResponseCode.SUCCESS) throw new Error("Invalid response");

	try {
		const address = AddressCodec.decode(response.body.body);

		socket.logger?.debug(`Got address ${address.toString()}`);

		return address;
	} catch (error) {
		throw new Error("Invalid response");
	}
};
