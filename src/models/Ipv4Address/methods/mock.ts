import { Ipv4Address } from "..";

export const mockAddress = (properties?: Partial<Ipv4Address.Properties>) =>
	new Ipv4Address({
		ip: Uint8Array.from([0, 0, 0, 0]),
		port: 6173,
		...properties,
	});
