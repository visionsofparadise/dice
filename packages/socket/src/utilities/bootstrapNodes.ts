import { base64 } from "@scure/base";
import { Nat1Endpoint } from "../models/Endpoint/Nat1";
import { NetworkAddress } from "../models/NetworkAddress";
import { IpFamily } from "../models/NetworkAddress/Constant";
import { Node } from "../models/Node";

export const BOOTSTRAP_NODES: Array<Node> = [
	new Node({
		endpoints: [
			new Nat1Endpoint({
				networkAddress: new NetworkAddress({
					family: IpFamily.IPv4,
					address: "127.0.0.1",
					port: 16173,
				}),
			}),
		],
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			recoveryBit: 0,
			signature: base64.decode("ANFSlZUdrzWTGppc+Bsje7AtXnWjMLyCbOgE4xlkDzZzIxlvlEJzBUMP8buxQLVEP8fsh35ck7xhnewH7XUXrA=="),
		},
	}),
	new Node({
		endpoints: [
			new Nat1Endpoint({
				networkAddress: new NetworkAddress({
					family: IpFamily.IPv4,
					address: "127.0.0.1",
					port: 26173,
				}),
			}),
		],
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			recoveryBit: 1,
			signature: base64.decode("h8gH8QVlnGZLm1yvXdZxi5du0p1mfl+gU7pHMWEn8R0LATSdapA5WpGSs41sKx3xYzkpAtK/kOcJOswg0m/sTg=="),
		},
	}),
	new Node({
		endpoints: [
			new Nat1Endpoint({
				networkAddress: new NetworkAddress({
					family: IpFamily.IPv4,
					address: "127.0.0.1",
					port: 36173,
				}),
			}),
		],
		sequenceNumber: 1,
		generation: 0,
		rSignature: {
			recoveryBit: 0,
			signature: base64.decode("/XaDr7PmrwsRrz8hD0Sbfl6S2lUA1YhnbK6xxuX9MG9CBOWMAyysudqWpAsOG2O4JZ63f6yfStxV6NUbr2bopA=="),
		},
	}),
];
