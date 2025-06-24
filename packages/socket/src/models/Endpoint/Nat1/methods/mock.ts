import { Nat1Endpoint } from "..";
import { NetworkAddress } from "../../../NetworkAddress";

export const mockNat1Endpoint = (properties?: Partial<Nat1Endpoint.Properties>) =>
	new Nat1Endpoint({
		networkAddress: NetworkAddress.mock(),
		...properties,
	});
