import { Socket } from "..";
import { createId } from "../../../utilities/Id";
import { Message } from "../../Message";
import { ResponseCode } from "../../Message/ResponseCode";
import { NatType } from "../../Node/Constant";
import { Nat3Node } from "../../Node/Nat3";
import { AwaitSocketResponseOptions } from "./awaitResponse";

export const sendSocketPunch = async (socket: Socket, targetNode: Nat3Node, properties?: Partial<Message.Properties<"punch">>, options?: AwaitSocketResponseOptions): Promise<void> => {
	if (socket.node.natType === NatType.NAT4) throw new Error("Unable to punch from nat4 node");

	const cacheKey = socket.createCacheKey(targetNode.address);

	if (!socket.cache.punch.has(cacheKey)) {
		const noopRequest = new Message({
			...properties,
			sourceNode: socket.node,
			targetNode,
			body: {
				type: "noop",
			},
		});

		await socket.send(noopRequest, targetNode.address);

		const punchRequest = new Message({
			...properties,
			sourceNode: socket.node,
			targetNode,
			body: {
				type: "punch",
				transactionId: createId(),
			},
		});

		await socket.send(punchRequest, targetNode.relayNode.address);

		const response = await socket.awaitResponse(punchRequest.body.transactionId, options);

		if (response.body.code !== ResponseCode.SUCCESS_NO_CONTENT) throw new Error("Invalid response");

		socket.cache.punch.set(cacheKey);
	}
};
