import { IpFamily } from "../../NetworkAddress/Constant";
import { Endpoint } from "../Codec";
import { Nat } from "../Constant";

export const scoreEndpoint = (endpoint: Endpoint): number => {
	switch (endpoint.networkAddress.family) {
		case IpFamily.IPv4: {
			switch (endpoint.nat) {
				case Nat.NAT1:
					return 4;
				case Nat.NAT3:
					return 2;
				case Nat.NAT4:
					return 0;
			}
		}
		case IpFamily.IPv6: {
			switch (endpoint.nat) {
				case Nat.NAT1:
					return 5;
				case Nat.NAT3:
					return 3;
				case Nat.NAT4:
					return 1;
			}
		}
	}
};
