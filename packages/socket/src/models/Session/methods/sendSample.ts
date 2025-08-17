import { defaults } from "@technically/lodash";
import { Session } from "..";
import { createId } from "../../../utilities/Id";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Address } from "../../Address";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Message } from "../../Message";
import { SampleBody } from "../../Message/BodyCodec";
import { AwaitSessionResponseOptions } from "./awaitResponse";

export const sendSessionSample = async (session: Session, targetEndpoint: Endpoint, body?: Partial<SampleBody>, options?: AwaitSessionResponseOptions): Promise<Array<Address>> => {
	const request = new Message({
		body: {
			type: "sample",
			magicBytes: MAGIC_BYTES,
			transactionId: createId(),
			...body,
		},
	});

	const [_, response] = await Promise.all([
		session.sendMessage(targetEndpoint, request),
		session.awaitResponse(
			{
				source: targetEndpoint,
				body: {
					type: "sampleResponse",
					transactionId: request.body.transactionId,
				},
			},
			defaults(options, session.options)
		),
	]);

	const addresses = response.body.addresses.filter((address) => session.isValidPoolAddress(address)).slice(0, 20);

	if (!session.cache.pool.isFull) {
		await Promise.allSettled(
			addresses.map(async (address) => {
				if (session.cache.pool.has(address.key)) return;

				await session.ping(new Nat1Endpoint({ address }));
			})
		);
	}

	return addresses;
};
