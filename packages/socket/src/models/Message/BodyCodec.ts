import { Codec } from "bufferfy";
import { IdCodec } from "../../utilities/Id";
import { EndpointCodec } from "../Endpoint/Codec";
import { Nat1EndpointCodec } from "../Endpoint/Nat1/Codec";
import { Nat3EndpointCodec } from "../Endpoint/Nat3/Codec";
import { DiceAddressCodec, SignatureCodec } from "../Keys/Codec";
import { NetworkAddressCodec } from "../NetworkAddress/Codec";
import { NodeCodec } from "../Node/Codec";

export const NoopBodyCodec = Codec.Object({
	type: Codec.Constant("noop"),
});

export interface NoopBody extends Codec.Type<typeof NoopBodyCodec> {}

export const PingBodyCodec = Codec.Object({
	type: Codec.Constant("ping"),
	transactionId: IdCodec,
});

export interface PingBody extends Codec.Type<typeof PingBodyCodec> {}

export const ReflectBodyCodec = Codec.Object({
	type: Codec.Constant("reflect"),
	transactionId: IdCodec,
});

export interface ReflectBody extends Codec.Type<typeof ReflectBodyCodec> {}

export const ReflectResponseBodyCodec = Codec.Object({
	type: Codec.Constant("reflectResponse"),
	transactionId: IdCodec,
	networkAddress: NetworkAddressCodec,
});

export interface ReflectResponseBody extends Codec.Type<typeof ReflectResponseBodyCodec> {}

export const PunchBodyCodec = Codec.Object({
	type: Codec.Constant("punch"),
	transactionId: IdCodec,
	endpoint: Codec.Union([Nat1EndpointCodec, Nat3EndpointCodec], Codec.UInt(8)),
});

export interface PunchBody extends Codec.Type<typeof PunchBodyCodec> {}

export const RevealBodyCodec = Codec.Object({
	type: Codec.Constant("reveal"),
	transactionId: IdCodec,
	target: Codec.Object({
		diceAddress: DiceAddressCodec,
		endpoint: Nat1EndpointCodec,
	}),
});

export interface RevealBody extends Codec.Type<typeof RevealBodyCodec> {}

export const RevealResponseBodyCodec = Codec.Object({
	type: Codec.Constant("revealResponse"),
	transactionId: IdCodec,
	networkAddress: NetworkAddressCodec,
});

export interface RevealResponseBody extends Codec.Type<typeof RevealResponseBodyCodec> {}

export const ListNodesBodyCodec = Codec.Object({
	type: Codec.Constant("listNodes"),
	transactionId: IdCodec,
	diceAddress: DiceAddressCodec,
});

export interface ListNodesBody extends Codec.Type<typeof ListNodesBodyCodec> {}

export const ListNodesResponseBodyCodec = Codec.Object({
	type: Codec.Constant("listNodesResponse"),
	transactionId: IdCodec,
	nodes: Codec.Array(NodeCodec, Codec.UInt(8)),
});

export interface ListNodesResponseBody extends Codec.Type<typeof ListNodesResponseBodyCodec> {}

export const PutDataBodyCodec = Codec.Object({
	type: Codec.Constant("putData"),
	data: Codec.Bytes(Codec.VarInt(60)),
});

export interface PutDataBody extends Codec.Type<typeof PutDataBodyCodec> {}

export const SuccessResponseBodyCodec = Codec.Object({
	type: Codec.Constant("successResponse"),
	transactionId: IdCodec,
});

export interface SuccessResponseBody extends Codec.Type<typeof SuccessResponseBodyCodec> {}

export const BadRequestErrorResponseBodyCodec = Codec.Object({
	type: Codec.Constant("badRequestErrorResponse"),
	transactionId: IdCodec,
});

export interface BadRequestErrorResponseBody extends Codec.Type<typeof BadRequestErrorResponseBodyCodec> {}

export const InternalErrorResponseBodyCodec = Codec.Object({
	type: Codec.Constant("internalErrorResponse"),
	transactionId: IdCodec,
});

export interface InternalErrorResponseBody extends Codec.Type<typeof InternalErrorResponseBodyCodec> {}

export const RelayableBodyCodec = Codec.Union([
	NoopBodyCodec,
	PingBodyCodec,
	PunchBodyCodec,
	RevealBodyCodec,
	RevealResponseBodyCodec,
	ListNodesBodyCodec,
	ListNodesResponseBodyCodec,
	PutDataBodyCodec,
	SuccessResponseBodyCodec,
	BadRequestErrorResponseBodyCodec,
	InternalErrorResponseBodyCodec,
]);

export type RelayableBody = Codec.Type<typeof RelayableBodyCodec>;

export type RelayableBodyMap = {
	[T in RelayableBody["type"]]: Extract<RelayableBody, { type: T }>;
};

export type RelayableBodyType = keyof RelayableBodyMap;

export const RelayBodyCodec = Codec.Object({
	type: Codec.Constant("relay"),
	target: Codec.Object({
		diceAddress: DiceAddressCodec,
		endpoint: EndpointCodec,
	}),
	body: RelayableBodyCodec,
	signature: SignatureCodec,
});

export interface RelayBody extends Codec.Type<typeof RelayBodyCodec> {}

export const MessageBodyCodec = Codec.Union([ReflectBodyCodec, ReflectResponseBodyCodec, ...RelayableBodyCodec.codecs, RelayBodyCodec]);

export type MessageBody = Codec.Type<typeof MessageBodyCodec>;

export type MessageBodyMap = {
	[T in MessageBody["type"]]: Extract<MessageBody, { type: T }>;
};

export type MessageBodyType = keyof MessageBodyMap;
