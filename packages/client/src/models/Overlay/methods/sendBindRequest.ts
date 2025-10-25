import { defaults, sampleSize } from "lodash-es";
import { Overlay } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType, RelayBindRequestBody } from "../../Message/BodyCodec";
import { createTransactionId } from "../../TransactionId/Codec";
import { AwaitOverlayResponseOptions } from "./awaitResponse";
import { SendOverlayOptions } from "./send";

export const sendOverlayBindRequest = async (
	overlay: Overlay,
	address: Address,
	coordinators: Array<Address>,
	body?: Partial<RelayBindRequestBody>,
	options?: AwaitOverlayResponseOptions & SendOverlayOptions
): Promise<void> => {
	if (!address) throw new DiceError("Invalid bind request target address");

	if (!overlay.external || !overlay.cache.bindOut.has(overlay.external.key, address.key)) {
		await overlay.noop(address);
	}

	if (overlay.external && overlay.cache.bindIn.has(address.key, overlay.external.key)) return;

	const request = new Message({
		flags: {
			isNotCandidate: overlay.isNotCandidate,
		},
		body: {
			type: MessageBodyType.RELAY_BIND_REQUEST,
			transactionId: createTransactionId(),
			targetAddress: address,
			...body,
		},
	});

	const sampleCoordinators = sampleSize(coordinators, overlay.options.concurrency);

	if (!sampleCoordinators.length) throw new DiceError("No relay addresses to bind request through");

	const abortController = new AbortController();

	await Promise.all([
		...sampleCoordinators.map(async (coordinator) => {
			return overlay.send(coordinator, request.buffer, { ...options, signal: abortController.signal });
		}),
		overlay.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.BIND,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, overlay.options)
		),
	]);
};
