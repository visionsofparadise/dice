import { Nat3Endpoint } from "..";
import { NetworkAddress } from "../../../NetworkAddress";

export const mockNat3Endpoint = (properties?: Partial<Nat3Endpoint.Properties>) =>
	new Nat3Endpoint({
		networkAddress: NetworkAddress.mock(),
		...properties,
	});
