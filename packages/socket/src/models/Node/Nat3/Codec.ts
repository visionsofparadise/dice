import { Codec } from "bufferfy";
import { Nat3Node } from ".";
import { AddressCodec } from "../../Address/Codec";
import { BaseNodePropertiesCodec } from "../Base/Codec";
import { NatType } from "../Constant";
import { Nat1NodeCodec } from "../Nat1/Codec";

export const Nat3NodePropertiesCodec = Codec.Merge([
	BaseNodePropertiesCodec,
	Codec.Object({
		natType: Codec.Constant(NatType.NAT3),
		address: AddressCodec,
		relayNode: Nat1NodeCodec,
	}),
]);

export interface Nat3NodeProperties extends Codec.Type<typeof Nat3NodePropertiesCodec> {}

export const Nat3NodeCodec = Codec.Transform(Nat3NodePropertiesCodec, {
	isValid: (value) => value instanceof Nat3Node,
	decode: (properties, buffer) => {
		const node = new Nat3Node(properties);

		node.buffer = buffer;

		return node;
	},
	encode: (nat3Node) => nat3Node.properties,
});
