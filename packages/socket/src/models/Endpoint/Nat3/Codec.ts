import { Codec } from "bufferfy";
import { Nat3Endpoint } from ".";
import { AddressCodec } from "../../Address/Codec";
import { Nat } from "../Constant";

export const Nat3EndpointPropertiesCodec = Codec.Object({
	nat: Codec.Constant(Nat.NAT3),
	address: AddressCodec,
	relayAddresses: Codec.Array(AddressCodec, Codec.UInt(8)),
});

export interface Nat3EndpointProperties extends Codec.Type<typeof Nat3EndpointPropertiesCodec> {}

export const Nat3EndpointCodec = Codec.Transform(Nat3EndpointPropertiesCodec, {
	isValid: (value) => value instanceof Nat3Endpoint,
	decode: (properties, buffer) => new Nat3Endpoint(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (endpoint) => endpoint.properties,
});
