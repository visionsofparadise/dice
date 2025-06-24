import { Nat4Endpoint } from "..";
import { NetworkAddress } from "../../../NetworkAddress";

export const mockNat4Endpoint = (properties?: Partial<Nat4Endpoint.Properties>) =>
	new Nat4Endpoint({
		networkAddress: NetworkAddress.mock(),
		...properties,
	});
