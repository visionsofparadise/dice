import { Client } from "..";
import { Endpoint } from "../../Endpoint";
import { DiceError } from "../../Error";
import { SendClientAddressOptions } from "./sendAddress";

export const sendClientEndpoint = async (client: Client, endpoint: Endpoint, buffer: Uint8Array, options?: SendClientAddressOptions): Promise<void> => {
	if (!endpoint.address) throw new DiceError("Endpoint has no address");

	await client.punch(endpoint);
	await client.sendAddress(endpoint.address, buffer, options);
};
