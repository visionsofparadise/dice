import { Codec } from "bufferfy";
import { Nat1Node } from "..";
import { createHash } from "../../../../utilities/Hash";
import { Nat1NodePropertiesCodec } from "../Codec";

export const hashNat1Node = (properties: Omit<Nat1Node.Properties, "rSignature">) => {
	return createHash(Codec.Omit(Nat1NodePropertiesCodec, ["rSignature"]).encode(properties));
};
