import { Codec } from "bufferfy";
import { Nat1Node } from ".";
import { AddressCodec } from "../../Address/Codec";
import { BaseNodePropertiesCodec } from "../Base/Codec";
import { NatType } from "../Constant";

export const Nat1NodePropertiesCodec = Codec.Merge([
	BaseNodePropertiesCodec,
	Codec.Object({
		natType: Codec.Constant(NatType.NAT1),
		address: AddressCodec,
	}),
]);

export interface Nat1NodeProperties extends Codec.Type<typeof Nat1NodePropertiesCodec> {}

export const Nat1NodeCodec = Codec.Transform(Nat1NodePropertiesCodec, {
	isValid: (value) => value instanceof Nat1Node,
	decode: (properties, buffer) => {
		const node = new Nat1Node(properties);

		node.buffer = buffer;

		return node;
	},
	encode: (node) => node.properties,
});
