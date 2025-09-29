import { Client } from "..";
import { AddressType } from "../../Address/Type";
import { DiceAddress } from "../../DiceAddress";
import { DiceError } from "../../Error";

export const requestClientBind = async (client: Client, diceAddress: DiceAddress, addressType?: AddressType): Promise<void> => {
	for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
		const endpoint = diceAddress[type];
		const overlay = client.overlays[type];

		if (!endpoint?.address || !endpoint.coordinators?.length || !overlay) continue;

		await overlay.requestBind(endpoint.address, endpoint.coordinators);

		return;
	}

	throw new DiceError("Unable to request bind");
};
