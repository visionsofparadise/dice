import { Codec } from "bufferfy";
import { Nat4Node } from ".";
import { AddressCodec } from "../../Address/Codec";
import { BaseNodePropertiesCodec } from "../Base/Codec";
import { NatType } from "../Constant";
import { Nat1NodeCodec } from "../Nat1/Codec";

export const Nat4NodePropertiesCodec = Codec.Merge([
	BaseNodePropertiesCodec,
	Codec.Object({
		natType: Codec.Constant(NatType.NAT4),
		address: AddressCodec,
		relayNode: Nat1NodeCodec,
	}),
]);

export interface Nat4NodeProperties extends Codec.Type<typeof Nat4NodePropertiesCodec> {}

export const Nat4NodeCodec = Codec.Transform(Nat4NodePropertiesCodec, {
	isValid: (value) => value instanceof Nat4Node,
	decode: (properties, buffer) => {
		const node = new Nat4Node(properties);

		node.buffer = buffer;

		return node;
	},
	encode: (nat4Node) => nat4Node.properties,
});
