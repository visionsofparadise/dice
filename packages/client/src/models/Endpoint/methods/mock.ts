import { Endpoint } from "..";
import { Address } from "../../Address";

export const mockEndpoint = (properties?: Partial<Endpoint.Properties>) =>
	new Endpoint({
		address: Address.mock(),
		...properties,
	});
