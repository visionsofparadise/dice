import { Codec } from "bufferfy";
import { Endpoint } from ".";
import { AddressCodec } from "../Address/Codec";

export const EndpointPropertiesCodec = Codec.Object({
	address: Codec.Optional(AddressCodec),
	relayAddresses: Codec.Array(AddressCodec, Codec.UInt(8)),
});

export interface EndpointProperties extends Codec.Type<typeof EndpointPropertiesCodec> {}

export const EndpointCodec = Codec.Transform(EndpointPropertiesCodec, {
	isValid: (value) => value instanceof Endpoint,
	decode: (properties, buffer) => new Endpoint(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (endpoint) => endpoint.properties,
});
