import { Client } from "..";
import { Address } from "../../Address";
import { Endpoint } from "../../Endpoint";

export const handleClientAddress = (client: Client, address: Address) => {
	if (!client.isValidAddress(address)) return;

	if (client.endpoint.address) {
		client.cache.punchOut.add(client.endpoint.address.key + address.key);
	}

	if (client.endpoint.relayAddresses.length >= client.options.relayCount) return;

	client.endpoint = new Endpoint({
		address: client.endpoint.address,
		relayAddresses: [...client.endpoint.relayAddresses, address],
	});
};
