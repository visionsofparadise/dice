import { Client } from "..";
import { AddressType } from "../../Address/Type";

export const openClient = async (client: Client, isBootstrapping = true): Promise<void> => {
	if (client.state === Client.STATE.OPENED) return;

	client.logger?.info("Opening");

	client.events.on("error", client.clientListeners.errorListener);

	for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
		client.overlays[addressType]?.events.on("address", client.overlayListeners.addressListener);
		await client.overlays[addressType]?.open(isBootstrapping);
	}

	client.state = Client.STATE.OPENED;
	client.events.emit("open");
	client.logger?.info("Open");
};
