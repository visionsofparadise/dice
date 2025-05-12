import { Codec } from "bufferfy";
import { IdCodec } from "../../utilities/Id";
import { PublicKeyCodec } from "../Keys/Codec";
import { ResponseCode } from "./ResponseCode";

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

export const PunchBodyCodec = Codec.Object({
	type: Codec.Constant("punch"),
	transactionId: IdCodec,
});

export interface PunchBody extends Codec.Type<typeof PunchBodyCodec> {}

export const ListNodesBodyCodec = Codec.Object({
	type: Codec.Constant("listNodes"),
	transactionId: IdCodec,
	publicKey: PublicKeyCodec,
});

export interface ListNodesBody extends Codec.Type<typeof ListNodesBodyCodec> {}

export const PutDataBodyCodec = Codec.Object({
	type: Codec.Constant("putData"),
	data: Codec.Bytes(Codec.VarInt(60)),
});

export interface PutDataBody extends Codec.Type<typeof PutDataBodyCodec> {}

export const ResponseSuccessBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.SUCCESS),
	body: Codec.Bytes(Codec.VarInt(60)),
});

export interface ResponseSuccessBody extends Codec.Type<typeof ResponseSuccessBodyCodec> {}

export const ResponseSuccessNoContentBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.SUCCESS_NO_CONTENT),
});

export interface ResponseSuccessNoContentBody extends Codec.Type<typeof ResponseSuccessNoContentBodyCodec> {}

export const ResponseBadRequestBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.BAD_REQUEST),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseBadRequestBody extends Codec.Type<typeof ResponseBadRequestBodyCodec> {}

export const ResponseUnauthorizedBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.UNAUTHORIZED),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseUnauthorizedBody extends Codec.Type<typeof ResponseUnauthorizedBodyCodec> {}

export const ResponseNotFoundBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.NOT_FOUND),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseNotFoundBody extends Codec.Type<typeof ResponseNotFoundBodyCodec> {}

export const ResponseTimeoutBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.TIMEOUT),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseTimeoutBody extends Codec.Type<typeof ResponseTimeoutBodyCodec> {}

export const ResponseRateLimitedBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.RATE_LIMITED),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseRateLimitedBody extends Codec.Type<typeof ResponseRateLimitedBodyCodec> {}

export const ResponseInternalBodyCodec = Codec.Object({
	type: Codec.Constant("response"),
	transactionId: IdCodec,
	code: Codec.Constant(ResponseCode.INTERNAL),
	message: Codec.Optional(Codec.String("utf8", Codec.UInt(8))),
});

export interface ResponseInternalBody extends Codec.Type<typeof ResponseInternalBodyCodec> {}

export const MessageBodyCodec = Codec.Union([
	NoopBodyCodec,
	PingBodyCodec,
	ReflectBodyCodec,
	PunchBodyCodec,
	ListNodesBodyCodec,
	PutDataBodyCodec,
	ResponseSuccessBodyCodec,
	ResponseSuccessNoContentBodyCodec,
	ResponseBadRequestBodyCodec,
	ResponseUnauthorizedBodyCodec,
	ResponseNotFoundBodyCodec,
	ResponseTimeoutBodyCodec,
	ResponseRateLimitedBodyCodec,
	ResponseInternalBodyCodec,
]);

export type MessageBody = Codec.Type<typeof MessageBodyCodec>;

export type MessageBodyMap = {
	[T in MessageBody["type"]]: Extract<MessageBody, { type: T }>;
};

export type MessageBodyType = keyof MessageBodyMap;
