import { hex } from "@scure/base";
import { Address } from "../models/Address";
import { IpType } from "../models/Address/Constant";
import { Nat1Node } from "../models/Node/Nat1";

export const BOOTSTRAP_NODES: Array<Nat1Node> = [
	new Nat1Node({
		address: new Address({
			ip: {
				type: IpType.IPV4,
				value: "127.0.0.1",
			},
			port: 16173,
		}),
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			signature: hex.decode("c635ffe35e8e7d9f68c453934e88197b4857a0d0402ce3326b55c6cd4424bc6d63e9be0de30bd21ba0169486400c22a51dda79da55c56deace0db47a6757fdc3"),
			r: 1,
		},
	}),
	new Nat1Node({
		address: new Address({
			ip: {
				type: IpType.IPV4,
				value: "127.0.0.1",
			},
			port: 26173,
		}),
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			signature: hex.decode("eb33f2ea5dd030b0073ca3495b975cf22acb6da4566d25cdca7855a47b44bc020116064a6c486ce18ed5e3efca07555a9f8d10d1db8d04e28f6b9fe6c6e785a3"),
			r: 0,
		},
	}),
	new Nat1Node({
		address: new Address({
			ip: {
				type: IpType.IPV4,
				value: "127.0.0.1",
			},
			port: 36173,
		}),
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			signature: hex.decode("9a084f39461c7a06448b0f9068bdf428ed865b7cd35eaccd2f180badf597a7f44d67e40a745fd54ef27245088c3b3c1f2fc4526083c0a0608ab7af9bfc0f58f4"),
			r: 0,
		},
	}),
];
