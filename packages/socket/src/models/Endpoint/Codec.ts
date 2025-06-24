import { Codec } from "bufferfy";
import { Nat1EndpointCodec } from "./Nat1/Codec";
import { Nat3EndpointCodec } from "./Nat3/Codec";
import { Nat4EndpointCodec } from "./Nat4/Codec";
import { compareEndpoints } from "./methods/compare";
import { getEndpointsArc } from "./methods/getEndpointsArc";
import { scoreEndpoint } from "./methods/score";

export const EndpointCodec = Codec.Union([Nat1EndpointCodec, Nat3EndpointCodec, Nat4EndpointCodec], Codec.UInt(8));

export type Endpoint = Codec.Type<typeof EndpointCodec>;

export const Endpoint = {
	compare: compareEndpoints,
	getArc: getEndpointsArc,
	score: scoreEndpoint,
};
