import { Codec } from "bufferfy";
import { Ipv4Address } from ".";
import { AddressType } from "../Address/Type";

export const Ipv4Codec = Codec.Bytes(4);
export const PortCodec = Codec.UInt(16);

export const Ipv4AddressPropertiesCodec = Codec.Object({
	type: Codec.Constant(AddressType.IPv4),
	ip: Ipv4Codec,
	port: PortCodec,
});

export interface Ipv4AddressProperties extends Codec.Type<typeof Ipv4AddressPropertiesCodec> {}

export const Ipv4AddressCodec = Codec.Transform(Ipv4AddressPropertiesCodec, {
	isValid: (value) => value instanceof Ipv4Address,
	decode: (properties, buffer) => new Ipv4Address(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (ipv6Address) => ipv6Address.properties,
});
