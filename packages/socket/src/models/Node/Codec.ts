import { Codec } from "bufferfy";
import { Node } from ".";
import { EndpointCodec } from "../Endpoint/Codec";
import { RSignatureCodec } from "../Keys/Codec";

export const NodePropertiesCodec = Codec.Object({
	endpoints: Codec.Array(EndpointCodec, Codec.UInt(8)),
	sequenceNumber: Codec.VarInt(60),
	generation: Codec.VarInt(60),
	rSignature: RSignatureCodec,
});

export interface NodeProperties extends Codec.Type<typeof NodePropertiesCodec> {}

export const NodeCodec = Codec.Transform(NodePropertiesCodec, {
	isValid: (value) => value instanceof Node,
	decode: (properties, buffer) => new Node(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (node) => node.properties,
});
