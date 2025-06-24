import { Codec } from "bufferfy";
import { NetworkAddress } from ".";
import { IpFamily } from "./Constant";

export const IpFamilyCodec = Codec.Enum([IpFamily.IPv4, IpFamily.IPv6], Codec.UInt(8));

export const PortCodec = Codec.UInt(16);

export const NetworkAddressPropertiesCodec = Codec.Object({
	family: IpFamilyCodec,
	address: Codec.String("utf8", Codec.UInt(8)),
	port: PortCodec,
});

export interface NetworkAddressProperties extends Codec.Type<typeof NetworkAddressPropertiesCodec> {}

export const NetworkAddressCodec = Codec.Transform(NetworkAddressPropertiesCodec, {
	isValid: (value) => value instanceof NetworkAddress,
	decode: (properties) => new NetworkAddress(properties),
	encode: (networkAddress) => networkAddress.properties,
});
