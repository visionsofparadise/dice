import { Codec } from "bufferfy";
import { Ipv6Address } from ".";
import { AddressType } from "../Address/Type";
import { PortCodec } from "../Ipv4Address/Codec";

export const Ipv6Codec = Codec.Bytes(16);

export const Ipv6AddressPropertiesCodec = Codec.Object({
	type: Codec.Constant(AddressType.IPv6),
	ip: Ipv6Codec,
	port: PortCodec,
});

export interface Ipv6AddressProperties extends Codec.Type<typeof Ipv6AddressPropertiesCodec> {}

export const Ipv6AddressCodec = Codec.Transform(Ipv6AddressPropertiesCodec, {
	isValid: (value) => value instanceof Ipv6Address,
	decode: (properties, buffer) => new Ipv6Address(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (ipv6Address) => ipv6Address.properties,
});
