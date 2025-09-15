import { Address } from "../models/Address";
import { Family } from "../models/Address/Constant";

export const BOOTSTRAP_ADDRESSES: Array<Address> = [
	new Address({
		ip: {
			family: Family.IPv4,
			address: Uint8Array.from([127, 0, 0, 1]),
		},
		port: 8000,
	}),
	new Address({
		ip: {
			family: Family.IPv4,
			address: Uint8Array.from([127, 0, 0, 1]),
		},
		port: 8001,
	}),
	new Address({
		ip: {
			family: Family.IPv4,
			address: Uint8Array.from([127, 0, 0, 1]),
		},
		port: 8002,
	}),
];
