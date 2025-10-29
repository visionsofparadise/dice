import { Stack } from "..";
import { AddressType } from "../../Address/Type";
import { DiceAddress } from "../../DiceAddress";
import { DiceError } from "../../Error";

export const requestClientBind = async (stack: Stack, diceAddress: DiceAddress, addressType?: AddressType): Promise<void> => {
	for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
		const endpoint = diceAddress[type];
		const layer = stack.layers[type];

		if (!endpoint?.address || !endpoint.coordinators?.length || !layer) continue;

		await layer.requestBind(endpoint.address, endpoint.coordinators);

		return;
	}

	throw new DiceError("Unable to request bind");
};
