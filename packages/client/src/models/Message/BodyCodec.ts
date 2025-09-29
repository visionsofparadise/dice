import { Codec } from "bufferfy";
import { AddressCodec } from "../Address/Codec";
import { Ipv4AddressCodec } from "../Ipv4Address/Codec";
import { Ipv6AddressCodec } from "../Ipv6Address/Codec";
import { TransactionIdCodec } from "../TransactionId/Codec";

export enum MessageBodyType {
	NOOP,
	PING,
	PONG,
	RELAY_BIND_REQUEST,
	BIND_REQUEST,
	BIND,
	LIST,
	ADDRESSES,
}

export const NoopBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.NOOP),
});

export interface NoopBody extends Codec.Type<typeof NoopBodyCodec> {}

export const PingBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PING),
	transactionId: TransactionIdCodec,
});

export interface PingBody extends Codec.Type<typeof PingBodyCodec> {}

export const PongBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.PONG),
	transactionId: TransactionIdCodec,
	reflectionAddress: AddressCodec,
});

export interface PongBody extends Codec.Type<typeof PongBodyCodec> {}

export const RelayBindRequestBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.RELAY_BIND_REQUEST),
	transactionId: TransactionIdCodec,
	targetAddress: AddressCodec,
});

export interface RelayBindRequestBody extends Codec.Type<typeof RelayBindRequestBodyCodec> {}

export const BindRequestBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.BIND_REQUEST),
	transactionId: TransactionIdCodec,
	sourceAddress: AddressCodec,
});

export interface BindRequestBody extends Codec.Type<typeof BindRequestBodyCodec> {}

export const BindBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.BIND),
	transactionId: TransactionIdCodec,
});

export interface BindBody extends Codec.Type<typeof BindBodyCodec> {}

export const ListBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.LIST),
	transactionId: TransactionIdCodec,
});

export interface ListBody extends Codec.Type<typeof ListBodyCodec> {}

export const AddressesBodyCodec = Codec.Object({
	type: Codec.Constant(MessageBodyType.ADDRESSES),
	transactionId: TransactionIdCodec,
	addresses: Codec.Union([Codec.Array(Ipv6AddressCodec, Codec.UInt(8)), Codec.Array(Ipv4AddressCodec, Codec.UInt(8))], Codec.UInt(8)),
	reflectionAddress: AddressCodec,
});

export interface AddressesBody extends Codec.Type<typeof AddressesBodyCodec> {}

export const MessageBodyCodec = Codec.Union([NoopBodyCodec, PingBodyCodec, PongBodyCodec, RelayBindRequestBodyCodec, BindRequestBodyCodec, BindBodyCodec, ListBodyCodec, AddressesBodyCodec]);

export type MessageBody = Codec.Type<typeof MessageBodyCodec>;

export type MessageBodyMap = {
	[T in MessageBody["type"]]: Extract<MessageBody, { type: T }>;
};
