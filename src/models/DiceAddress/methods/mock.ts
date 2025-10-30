import { DiceAddress } from "..";
import { AddressType } from "../../Address/Type";
import { Ipv6Address } from "../../Ipv6Address";

export const mockEndpoint = (properties?: Partial<DiceAddress.Properties>) =>
	new DiceAddress({
		[AddressType.IPv6]: {
			address: Ipv6Address.mock(),
		},
		...properties,
	});
