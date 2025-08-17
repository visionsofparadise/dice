import { defaults } from "@technically/lodash";
import { Session } from "..";
import { createId } from "../../../utilities/Id";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Endpoint } from "../../Endpoint/Codec";
import { Message } from "../../Message";
import { PingBody } from "../../Message/BodyCodec";
import { AwaitSessionResponseOptions } from "./awaitResponse";

export const sendSessionPing = async (session: Session, targetEndpoint: Endpoint, body?: Partial<PingBody>, options?: AwaitSessionResponseOptions): Promise<void> => {
	const request = new Message({
		body: {
			type: "ping",
			magicBytes: MAGIC_BYTES,
			transactionId: createId(),
			...body,
		},
	});

	await Promise.all([
		session.sendMessage(targetEndpoint, request),
		session.awaitResponse(
			{
				source: targetEndpoint,
				body: {
					type: "pingResponse",
					transactionId: request.body.transactionId,
				},
			},
			defaults(options, session.options)
		),
	]);
};
