import { Stack } from "..";
import { AddressType } from "../../Address/Type";
import { DiceAddress } from "../../DiceAddress";
import { SendOverlayOptions } from "../../Layer/methods/send";

export const sendClient = async (stack: Stack, diceAddress: DiceAddress, buffer: Uint8Array, addressType?: AddressType, options?: SendOverlayOptions): Promise<void> => {
	for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
		const endpoint = diceAddress[type];
		const layer = stack.layers[type];

		if (!endpoint?.address || !layer) continue;

		if (endpoint.coordinators?.length) {
			try {
				await layer.requestBind(endpoint.address, endpoint.coordinators);
			} catch (error) {
				stack.events.emit("error", error);
			}
		}

		await layer.send(endpoint.address, buffer, options);

		return;
	}
};
