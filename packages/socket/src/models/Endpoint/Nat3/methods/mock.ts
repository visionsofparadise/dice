import { Nat3Endpoint } from "..";
import { Address } from "../../../Address";

export const mockNat3Endpoint = (properties?: Partial<Nat3Endpoint.Properties>) =>
	new Nat3Endpoint({
		address: Address.mock(),
		...properties,
	});
