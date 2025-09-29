import { Client } from "..";
import { AddressType } from "../../Address/Type";
import { DiceAddress } from "../../DiceAddress";
import { SendOverlayOptions } from "../../Overlay/methods/send";

export const sendClient = async (client: Client, diceAddress: DiceAddress, buffer: Uint8Array, addressType?: AddressType, options?: SendOverlayOptions): Promise<void> => {
	for (const type of addressType ? [addressType] : [AddressType.IPv6, AddressType.IPv4]) {
		const endpoint = diceAddress[type];
		const overlay = client.overlays[type];

		if (!endpoint?.address || !overlay) continue;

		if (endpoint.coordinators?.length) {
			try {
				await overlay.requestBind(endpoint.address, endpoint.coordinators);
			} catch (error) {
				client.events.emit("error", error);
			}
		}

		await overlay.send(endpoint.address, buffer, options);

		return;
	}
};
