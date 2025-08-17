import { Codec } from "bufferfy";
import { Nat1EndpointCodec } from "./Nat1/Codec";
import { Nat3EndpointCodec } from "./Nat3/Codec";

export const EndpointCodec = Codec.Union([Nat1EndpointCodec, Nat3EndpointCodec], Codec.UInt(8));

export type Endpoint = Codec.Type<typeof EndpointCodec>;
