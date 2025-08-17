import { Address } from "..";
import { Family } from "../Constant";

export const mockAddress = (properties?: Partial<Address.Properties>) =>
	new Address({
		ip: {
			family: Family.IPv4,
			address: Uint8Array.from([0, 0, 0, 0]),
		},
		port: 6173,
		...properties,
	});
