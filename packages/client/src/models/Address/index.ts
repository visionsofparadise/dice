import { Codec } from "bufferfy";
import { AddressInfo } from "net";
import { DiceError } from "../Error";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { AddressCodec } from "./Codec";

export type Address = Codec.Type<typeof AddressCodec>;

export const Address = {
	fromAddressInfo: (addressInfo: AddressInfo): Address => {
		switch (addressInfo.family) {
			case "IPv6": {
				return Ipv6Address.fromAddressInfo(addressInfo);
			}
			case "IPv4": {
				return Ipv4Address.fromAddressInfo(addressInfo);
			}
		}

		throw new DiceError("Invalid address info");
	},
};
