import { Codec } from "bufferfy";
import { Nat3Node } from "..";
import { createHash } from "../../../../utilities/Hash";
import { Nat3NodePropertiesCodec } from "../Codec";

export const hashNat3Node = (properties: Omit<Nat3Node.Properties, "rSignature">) => {
	return createHash(Codec.Omit(Nat3NodePropertiesCodec, ["rSignature"]).encode(properties));
};
