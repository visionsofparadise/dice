import { defaults } from "@technically/lodash";
import { Session } from "..";
import { createId } from "../../../utilities/Id";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Address } from "../../Address";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Message } from "../../Message";
import { ReflectBody } from "../../Message/BodyCodec";
import { AwaitSessionResponseOptions } from "./awaitResponse";

export const sendSessionReflect = async (session: Session, targetEndpoint: Nat1Endpoint, body?: Partial<ReflectBody>, options?: AwaitSessionResponseOptions): Promise<Address> => {
	const request = new Message({
		body: {
			type: "reflect",
			magicBytes: MAGIC_BYTES,
			transactionId: createId(),
			...body,
		},
	});

	const [_, response] = await Promise.all([
		session.sendUdpMessage(targetEndpoint.address, request),
		session.awaitResponse(
			{
				source: targetEndpoint,
				body: {
					type: "reflectResponse",
					transactionId: request.body.transactionId,
				},
			},
			defaults(options, session.options)
		),
	]);

	return response.body.address;
};
