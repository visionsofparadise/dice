import { Codec } from "bufferfy";
import { fromByteArray, parse } from "ipaddr.js";
import { Address } from ".";
import { IpType } from "./Constant";

export const IpTypeCodec = Codec.Enum([IpType.IPV4, IpType.IPV6], Codec.UInt(8));

export const Ipv4PropertiesCodec = Codec.Object({
	type: Codec.Constant(IpType.IPV4),
	value: Codec.Bytes(4),
});

export const Ipv4Codec = Codec.Transform(Ipv4PropertiesCodec, {
	isValid: (value) =>
		!!(value && typeof value === "object" && "type" in value && value.type === IpType.IPV4 && "value" in value && typeof value.value === "string" && parse(value.value).kind() === IpType.IPV4),
	decode: (properties) => ({
		type: properties.type,
		value: fromByteArray([...properties.value.values()]).toString(),
	}),
	encode: (ipv4) => ({
		type: ipv4.type,
		value: new Uint8Array(parse(ipv4.value).toByteArray()),
	}),
});

export const Ipv6PropertiesCodec = Codec.Object({
	type: Codec.Constant(IpType.IPV6),
	value: Codec.Bytes(16),
});

export const Ipv6Codec = Codec.Transform(Ipv6PropertiesCodec, {
	isValid: (value) =>
		!!(value && typeof value === "object" && "type" in value && value.type === IpType.IPV6 && "value" in value && typeof value.value === "string" && parse(value.value).kind() === IpType.IPV6),
	decode: (properties) => ({
		type: properties.type,
		value: fromByteArray([...properties.value.values()]).toString(),
	}),
	encode: (ipv6) => ({
		type: ipv6.type,
		value: new Uint8Array(parse(ipv6.value).toByteArray()),
	}),
});

export const IpCodec = Codec.Union([Ipv4Codec, Ipv6Codec]);

export type Ip = Codec.Type<typeof IpCodec>;

export const PortCodec = Codec.UInt(16);

export const AddressPropertiesCodec = Codec.Object({
	ip: IpCodec,
	port: PortCodec,
});

export interface AddressProperties extends Codec.Type<typeof AddressPropertiesCodec> {}

export const AddressCodec = Codec.Transform(AddressPropertiesCodec, {
	isValid: (value) => value instanceof Address,
	decode: (properties) => new Address(properties),
	encode: (address) => address.properties,
});
