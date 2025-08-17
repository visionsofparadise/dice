import { Session } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Endpoint } from "../../Endpoint/Codec";
import { Message } from "../../Message";
import { PutBody } from "../../Message/BodyCodec";

export const sendSessionPut = async (session: Session, targetEndpoint: Endpoint, data: Uint8Array, body?: Partial<PutBody>): Promise<void> => {
	const request = new Message({
		body: {
			type: "put",
			magicBytes: MAGIC_BYTES,
			data,
			...body,
		},
	});

	await session.sendMessage(targetEndpoint, request);
};
