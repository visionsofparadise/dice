import { md5 } from "@noble/hashes/legacy";
import { sha256 } from "@noble/hashes/sha2";
import { Codec } from "bufferfy";

export const ChecksumCodec = Codec.Bytes(16);
export const createChecksum = (data: Uint8Array) => md5(data);

export const HashCodec = Codec.Bytes(32);
export const createHash = (data: Uint8Array) => sha256(sha256(data));
