import { Nat1Endpoint } from "..";
import { Address } from "../../../Address";

export const mockNat1Endpoint = (properties?: Partial<Nat1Endpoint.Properties>) =>
	new Nat1Endpoint({
		address: Address.mock(),
		...properties,
	});
