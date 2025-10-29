import { defaults, sampleSize } from "lodash-es";
import { Layer } from "..";
import { Address } from "../../Address";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { MessageBodyType, RelayBindRequestBody } from "../../Message/BodyCodec";
import { AwaitResponseOptions } from "../../ResponseCorrelator";
import { createTransactionId } from "../../TransactionId/Codec";
import { SendOverlayOptions } from "./send";

export const sendOverlayBindRequest = async (
	layer: Layer,
	address: Address,
	coordinators: Array<Address>,
	body?: Partial<RelayBindRequestBody>,
	options?: AwaitResponseOptions & SendOverlayOptions
): Promise<void> => {
	if (!address) throw new DiceError("Invalid bind request target address");
	if (!coordinators || coordinators.length === 0) {
		throw new DiceError(`No coordinators available for ${address.toString()}`);
	}

	if (!layer.external || !layer.bindings.hasOutboundBinding(layer.external.key, address.key)) {
		await layer.noop(address);
	}

	if (layer.external && layer.bindings.hasInboundBinding(address.key, layer.external.key)) return;

	const request = new Message({
		flags: {
			isNotCandidate: layer.isNotCandidate,
		},
		body: {
			type: MessageBodyType.RELAY_BIND_REQUEST,
			transactionId: createTransactionId(),
			targetAddress: address,
			...body,
		},
	});

	const sampleCoordinators = sampleSize(coordinators, layer.options.concurrency);

	if (!sampleCoordinators.length) throw new DiceError("No relay addresses to bind request through");

	// AbortController cancels pending send retries when BIND response is received
	const abortController = new AbortController();

	await Promise.all([
		...sampleCoordinators.map(async (coordinator) => {
			return layer.send(coordinator, request.buffer, { ...options, signal: abortController.signal });
		}),
		layer.correlator.awaitResponse(
			{
				source: {
					address,
				},
				body: {
					type: MessageBodyType.BIND,
					transactionId: request.body.transactionId,
				},
			},
			defaults({ ...options, sendAbortController: abortController }, layer.options)
		),
	]);
};
