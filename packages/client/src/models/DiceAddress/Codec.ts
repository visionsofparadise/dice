import { Codec } from "bufferfy";
import { DiceAddress } from ".";
import { AddressType } from "../Address/Type";
import { Ipv4AddressCodec } from "../Ipv4Address/Codec";
import { Ipv6AddressCodec } from "../Ipv6Address/Codec";

export const DiceAddressPropertiesCodec = Codec.Object({
	[AddressType.IPv6]: Codec.Optional(
		Codec.Object({
			address: Ipv6AddressCodec,
			coordinators: Codec.Optional(Codec.Array(Ipv6AddressCodec, Codec.UInt(8))),
		})
	),
	[AddressType.IPv4]: Codec.Optional(
		Codec.Object({
			address: Ipv4AddressCodec,
			coordinators: Codec.Optional(Codec.Array(Ipv4AddressCodec, Codec.UInt(8))),
		})
	),
});

export interface DiceAddressProperties extends Codec.Type<typeof DiceAddressPropertiesCodec> {}

export const DiceAddressCodec = Codec.Transform(DiceAddressPropertiesCodec, {
	isValid: (value) => value instanceof DiceAddress,
	decode: (properties, buffer) => new DiceAddress(properties, { buffer, byteLength: buffer.byteLength }),
	encode: (diceAddress) => diceAddress.properties,
});
