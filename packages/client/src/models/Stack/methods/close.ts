import { Stack } from "..";
import { AddressType } from "../../Address/Type";

export const closeClient = (stack: Stack): void => {
	if (stack.state === Stack.STATE.CLOSED) return;

	stack.logger?.info("Closing");

	stack.events.removeListener("error", stack.clientListeners.errorListener);

	for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
		stack.layers[addressType]?.events.removeListener("address", stack.overlayListeners.addressListener);
		stack.layers[addressType]?.close();
	}

	stack.state = Stack.STATE.CLOSED;
	stack.events.emit("close");
	stack.logger?.info("Closed");
};
