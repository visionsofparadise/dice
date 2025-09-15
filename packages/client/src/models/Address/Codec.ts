import { Codec } from "bufferfy";
import { Address } from ".";
import { Family } from "./Constant";

export const FamilyCodec = Codec.Enum([Family.IPv4, Family.IPv6], Codec.UInt(8));
export const Ipv4Codec = Codec.Bytes(4);
export const Ipv6Codec = Codec.Bytes(16);
export const PortCodec = Codec.UInt(16);

export const AddressPropertiesCodec = Codec.Object({
	ip: Codec.Union([
		Codec.Object({
			family: Codec.Constant(Family.IPv4),
			address: Ipv4Codec,
		}),
		Codec.Object({
			family: Codec.Constant(Family.IPv6),
			address: Ipv6Codec,
		}),
	]),
	port: PortCodec,
});

export interface AddressProperties extends Codec.Type<typeof AddressPropertiesCodec> {}

export const AddressCodec = Codec.Transform(AddressPropertiesCodec, {
	isValid: (value) => value instanceof Address,
	decode: (properties, buffer) => new Address(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (address) => address.properties,
});
