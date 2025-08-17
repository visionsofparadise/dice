import { Codec } from "bufferfy";
import { IdCodec } from "../../utilities/Id";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { AddressCodec } from "../Address/Codec";

export const NoopBodyCodec = Codec.Object({
	type: Codec.Constant("noop"),
});

export interface NoopBody extends Codec.Type<typeof NoopBodyCodec> {}

export const PingBodyCodec = Codec.Object({
	type: Codec.Constant("ping"),
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	transactionId: IdCodec,
});

export interface PingBody extends Codec.Type<typeof PingBodyCodec> {}

export const PingResponseBodyCodec = Codec.Object({
	type: Codec.Constant("pingResponse"),
	transactionId: IdCodec,
});

export interface PingResponseBody extends Codec.Type<typeof PingResponseBodyCodec> {}

export const ReflectBodyCodec = Codec.Object({
	type: Codec.Constant("reflect"),
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	transactionId: IdCodec,
});

export interface ReflectBody extends Codec.Type<typeof ReflectBodyCodec> {}

export const ReflectResponseBodyCodec = Codec.Object({
	type: Codec.Constant("reflectResponse"),
	transactionId: IdCodec,
	address: AddressCodec,
});

export interface ReflectResponseBody extends Codec.Type<typeof ReflectResponseBodyCodec> {}

export const PunchBodyCodec = Codec.Object({
	type: Codec.Constant("punch"),
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	transactionId: IdCodec,
	sourceAddress: AddressCodec,
	targetAddress: AddressCodec,
});

export interface PunchBody extends Codec.Type<typeof PunchBodyCodec> {}

export const PunchResponseBodyCodec = Codec.Object({
	type: Codec.Constant("punchResponse"),
	transactionId: IdCodec,
});

export interface PunchResponseBody extends Codec.Type<typeof PunchResponseBodyCodec> {}

export const SampleBodyCodec = Codec.Object({
	type: Codec.Constant("sample"),
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	transactionId: IdCodec,
});

export interface SampleBody extends Codec.Type<typeof SampleBodyCodec> {}

export const SampleResponseBodyCodec = Codec.Object({
	type: Codec.Constant("sampleResponse"),
	transactionId: IdCodec,
	addresses: Codec.Array(AddressCodec, Codec.UInt(8)),
});

export interface SampleResponseBody extends Codec.Type<typeof SampleResponseBodyCodec> {}

export const PutBodyCodec = Codec.Object({
	type: Codec.Constant("put"),
	magicBytes: Codec.Bytes(MAGIC_BYTES),
	data: Codec.Bytes(Codec.VarInt(60)),
});

export interface PutBody extends Codec.Type<typeof PutBodyCodec> {}

export const MessageBodyCodec = Codec.Union([
	NoopBodyCodec,
	PingBodyCodec,
	PingResponseBodyCodec,
	ReflectBodyCodec,
	ReflectResponseBodyCodec,
	PunchBodyCodec,
	PunchResponseBodyCodec,
	SampleBodyCodec,
	SampleResponseBodyCodec,
	PutBodyCodec,
]);

export type MessageBody = Codec.Type<typeof MessageBodyCodec>;

export type MessageBodyMap = {
	[T in MessageBody["type"]]: Extract<MessageBody, { type: T }>;
};

export type MessageBodyType = keyof MessageBodyMap;
