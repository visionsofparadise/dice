import { Codec } from "bufferfy";

export const IdCodec = Codec.Bytes(16);

export const createId = () => crypto.getRandomValues(new Uint8Array(IdCodec.byteLength()));
