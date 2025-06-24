import { NetworkAddress } from "..";
import { IpFamily } from "../Constant";

export const mockNetworkAddress = (properties?: Partial<NetworkAddress.Properties>) =>
	new NetworkAddress({
		family: IpFamily.IPv4,
		address: "0.0.0.0",
		port: 6173,
		...properties,
	});
