import { defaults, sampleSize } from "@technically/lodash";
import { Session } from "..";
import { createId } from "../../../utilities/Id";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { PunchBody } from "../../Message/BodyCodec";
import { AwaitSessionResponseOptions } from "./awaitResponse";

export interface SendSessionPunchOptions extends AwaitSessionResponseOptions {
	isPrePunchDisabled?: boolean;
}

export const sendSessionPunch = async (session: Session, targetEndpoint: Nat3Endpoint, body?: Partial<PunchBody>, options?: SendSessionPunchOptions): Promise<void> => {
	if (session.cache.pool.has(targetEndpoint.address.key) || session.cache.punch.has(targetEndpoint.address.key)) return;

	if (!session.endpoint) throw new DiceError("Invalid punch source endpoint");

	if (!options?.isPrePunchDisabled) await session.noop(targetEndpoint.address);

	const request = new Message({
		body: {
			type: "punch",
			magicBytes: MAGIC_BYTES,
			transactionId: createId(),
			sourceAddress: session.endpoint.address,
			targetAddress: targetEndpoint.address,
			...body,
		},
	});

	const relayAddresses = sampleSize(targetEndpoint.relayAddresses, session.options.concurrency);

	await Promise.all([
		...relayAddresses.map(async (networkAddress) => {
			return session.sendUdpMessage(networkAddress, request);
		}),
		session.awaitResponse(
			{
				source: targetEndpoint,
				body: {
					type: "punchResponse",
					transactionId: request.body.transactionId,
				},
			},
			defaults(options, session.options)
		),
	]);
};
