import { Codec } from "bufferfy";
import { Nat1Endpoint } from ".";
import { NetworkAddressCodec } from "../../NetworkAddress/Codec";
import { Nat } from "../Constant";

export const Nat1EndpointPropertiesCodec = Codec.Object({
	nat: Codec.Constant(Nat.NAT1),
	networkAddress: NetworkAddressCodec,
});

export interface Nat1EndpointProperties extends Codec.Type<typeof Nat1EndpointPropertiesCodec> {}

export const Nat1EndpointCodec = Codec.Transform(Nat1EndpointPropertiesCodec, {
	isValid: (value) => value instanceof Nat1Endpoint,
	decode: (properties, buffer) => new Nat1Endpoint(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (endpoint) => endpoint.properties,
});
