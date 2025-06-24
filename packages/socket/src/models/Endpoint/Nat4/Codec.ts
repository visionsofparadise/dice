import { Codec } from "bufferfy";
import { Nat4Endpoint } from ".";
import { IpFamilyCodec } from "../../NetworkAddress/Codec";
import { Nat } from "../Constant";

export const Nat4EndpointPropertiesCodec = Codec.Object({
	nat: Codec.Constant(Nat.NAT4),
	networkAddress: Codec.Object({
		family: IpFamilyCodec,
	}),
});

export interface Nat4EndpointProperties extends Codec.Type<typeof Nat4EndpointPropertiesCodec> {}

export const Nat4EndpointCodec = Codec.Transform(Nat4EndpointPropertiesCodec, {
	isValid: (value) => value instanceof Nat4Endpoint,
	decode: (properties, buffer) => new Nat4Endpoint(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (endpoint) => endpoint.properties,
});
