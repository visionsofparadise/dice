import { Codec } from "bufferfy";
import { Nat1NodeCodec } from "./Nat1/Codec";
import { Nat3NodeCodec } from "./Nat3/Codec";
import { Nat4NodeCodec } from "./Nat4/Codec";

export const NodeCodec = Codec.Union([Nat1NodeCodec, Nat3NodeCodec, Nat4NodeCodec], Codec.UInt(8));

export type Node = Codec.Type<typeof NodeCodec>;
