import { Client } from "..";
import { AddressType } from "../../Address/Type";

export const closeClient = (client: Client): void => {
	if (client.state === Client.STATE.CLOSED) return;

	client.logger?.info("Closing");

	client.events.removeListener("error", client.clientListeners.errorListener);

	for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
		client.overlays[addressType]?.events.removeListener("address", client.overlayListeners.addressListener);
		client.overlays[addressType]?.close();
	}

	client.state = Client.STATE.CLOSED;
	client.events.emit("close");
	client.logger?.info("Closed");
};
