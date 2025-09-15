import { Client } from "..";
import { Endpoint } from "../../Endpoint";
import { DiceError } from "../../Error";

export const sendClientEndpoint = async (client: Client, endpoint: Endpoint, buffer: Uint8Array): Promise<void> => {
	if (!endpoint.address) throw new DiceError("Endpoint has no address");

	await client.punch(endpoint);
	await client.sendAddress(endpoint.address, buffer);
};
