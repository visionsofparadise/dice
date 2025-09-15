import { Client } from "..";
import { Endpoint } from "../../Endpoint";

export const healthcheckClient = async (client: Client): Promise<void> => {
	try {
		if (client.isHealthchecking) return;

		client.isHealthchecking = true;
		client.logger?.debug("Healthchecking");

		const healthyAddressKeys = new Set<string>();

		const promises = client.endpoint.relayAddresses.map(async (address) => {
			if (!client.endpoint.address || !client.cache.punchOut.has(client.endpoint.address.key + address.key)) {
				await client.ping(address);
			}

			healthyAddressKeys.add(address.key);
		});

		if (promises.length) await Promise.allSettled(promises);

		const healthyAddresses = client.endpoint.relayAddresses.filter((address) => healthyAddressKeys.has(address.key));

		const newAddresses = await client.findAddresses(client.options.relayCount - healthyAddresses.length);

		client.endpoint = new Endpoint({
			address: client.endpoint.address,
			relayAddresses: [...healthyAddresses, ...newAddresses],
		});
	} catch (error) {
		client.events.emit("error", error);
	} finally {
		client.logger?.debug("Healthchecking complete");
		client.isHealthchecking = false;
	}
};
