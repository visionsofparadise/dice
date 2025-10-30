import { Ipv6Address } from "..";

export const mockAddress = (properties?: Partial<Ipv6Address.Properties>) =>
	new Ipv6Address({
		ip: Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
		port: 6173,
		...properties,
	});
