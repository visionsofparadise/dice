import { Client } from "..";
import { Address } from "../../Address";

export const isValidClientAddress = (client: Client, address: Address | undefined): boolean => {
	return (
		!!address &&
		address.ip.family === client.localAddress.ip.family &&
		address.key !== client.localAddress.key &&
		address.key !== client.endpoint.address?.key &&
		client.options.bootstrapAddresses.every((bootstrapAddress) => address.prefix !== bootstrapAddress.prefix) &&
		client.endpoint.relayAddresses.every((relayAddress) => address.prefix !== relayAddress.prefix)
	);
};
