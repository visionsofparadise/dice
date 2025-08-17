import { md5 } from "@noble/hashes/legacy";
import { Codec } from "bufferfy";

export const ChecksumCodec = Codec.Bytes(16);
export const createChecksum = (data: Uint8Array) => md5(data);
