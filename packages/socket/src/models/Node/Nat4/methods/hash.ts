import { Codec } from "bufferfy";
import { Nat4Node } from "..";
import { createHash } from "../../../../utilities/Hash";
import { Nat4NodePropertiesCodec } from "../Codec";

export const hashNat4Node = (properties: Omit<Nat4Node.Properties, "rSignature">) => {
	return createHash(Codec.Omit(Nat4NodePropertiesCodec, ["rSignature"]).encode(properties));
};
