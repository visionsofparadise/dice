import { compare } from "uint8array-tools";
import { Client } from "..";
import { Address } from "../../Address";
import { Endpoint } from "../../Endpoint";

export const handleClientReflection = (client: Client, remoteAddress: Address, reflectionAddress: Address) => {
	if (!client.reflection || compare(client.reflection.address.buffer, reflectionAddress.buffer) !== 0) {
		client.reflection = {
			prefixes: new Set([remoteAddress.prefix]),
			address: reflectionAddress,
		};

		return;
	}

	if (client.reflection.prefixes.size < 2) {
		client.reflection.prefixes.add(remoteAddress.prefix);

		if (client.reflection.prefixes.size > 1) {
			client.endpoint = new Endpoint({
				...client.endpoint,
				address: client.reflection.address,
			});
		}
	}
};
