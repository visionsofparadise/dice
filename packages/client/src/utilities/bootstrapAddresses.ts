import { AddressType } from "../models/Address/Type";
import { Ipv4Address } from "../models/Ipv4Address";
import { Ipv6Address } from "../models/Ipv6Address";

export const BOOTSTRAP_ADDRESS = {
	[AddressType.IPv6]: [
		new Ipv6Address({
			ip: Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
			port: 8000,
		}),
		new Ipv6Address({
			ip: Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
			port: 8001,
		}),
		new Ipv6Address({
			ip: Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
			port: 8002,
		}),
	],
	[AddressType.IPv4]: [
		new Ipv4Address({
			ip: Uint8Array.from([127, 0, 0, 1]),
			port: 8000,
		}),
		new Ipv4Address({
			ip: Uint8Array.from([127, 0, 0, 1]),
			port: 8001,
		}),
		new Ipv4Address({
			ip: Uint8Array.from([127, 0, 0, 1]),
			port: 8002,
		}),
	],
};
