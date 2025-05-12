import { Address } from "..";
import { IpType } from "../Constant";

export const mockAddress = (properties?: Partial<Address.Properties>) =>
	new Address({
		ip: {
			type: IpType.IPV6,
			value: "::",
		},
		port: 6173,
		...properties,
	});
