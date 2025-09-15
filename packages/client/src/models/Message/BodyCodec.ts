import { Codec } from "bufferfy";
import { IdCodec } from "../../utilities/Id";
import { AddressCodec } from "../Address/Codec";

export enum MessageBodyType {
	NOOP,
	PING,
	PING_RESPONSE,
	RELAY_PUNCH,
	PUNCH,
	PUNCH_RESPONSE,
	LIST,
	LIST_RESPONSE,
}

export const NoopBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.NOOP),
});

export interface NoopBody extends Codec.Type<typeof NoopBodyCodec> {}

export const PingBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PING),
	transactionId: IdCodec,
});

export interface PingBody extends Codec.Type<typeof PingBodyCodec> {}

export const PingResponseBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PING_RESPONSE),
	reflectionAddress: AddressCodec,
});

export interface PingResponseBody extends Codec.Type<typeof PingResponseBodyCodec> {}

export const RelayPunchBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.RELAY_PUNCH),
	targetAddress: AddressCodec,
});

export interface RelayPunchBody extends Codec.Type<typeof RelayPunchBodyCodec> {}

export const PunchBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PUNCH),
	sourceAddress: AddressCodec,
});

export interface PunchBody extends Codec.Type<typeof PunchBodyCodec> {}

export const PunchResponseBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PUNCH_RESPONSE),
});

export interface PunchResponseBody extends Codec.Type<typeof PunchResponseBodyCodec> {}

export const ListBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.LIST),
});

export interface ListBody extends Codec.Type<typeof ListBodyCodec> {}

export const ListResponseBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.LIST_RESPONSE),
	addresses: Codec.Array(AddressCodec, Codec.UInt(8)),
	reflectionAddress: AddressCodec,
});

export interface ListResponseBody extends Codec.Type<typeof ListResponseBodyCodec> {}

export const MessageBodyCodec = Codec.Union([NoopBodyCodec, PingBodyCodec, PingResponseBodyCodec, RelayPunchBodyCodec, PunchBodyCodec, PunchResponseBodyCodec, ListBodyCodec, ListResponseBodyCodec]);

export type MessageBody = Codec.Type<typeof MessageBodyCodec>;

export type MessageBodyMap = {
	[T in MessageBody["type"]]: Extract<MessageBody, { type: T }>;
};
