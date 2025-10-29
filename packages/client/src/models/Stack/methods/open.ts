import { Stack } from "..";
import { AddressType } from "../../Address/Type";

export const openClient = async (stack: Stack): Promise<void> => {
	if (stack.state === Stack.STATE.OPENED) return;

	stack.logger?.info("Opening");

	stack.events.on("error", stack.clientListeners.errorListener);

	// Set up layer event aggregation
	for (const addressType of [AddressType.IPv6, AddressType.IPv4]) {
		const layer = stack.layers[addressType];
		if (!layer) continue;

		// Aggregate layer events to stack
		layer.events.on("address", stack.overlayListeners.addressListener);
		layer.events.on("buffer", (buffer, remoteInfo) => stack.events.emit("buffer", buffer, remoteInfo));
		layer.events.on("envelope", (envelope, context) => stack.events.emit("envelope", envelope, context));
		layer.events.on("message", (buffer, context) => stack.events.emit("message", buffer, context));
		layer.events.on("diceMessage", (message, context) => stack.events.emit("diceMessage", message, context));
		layer.events.on("coordinatorPoolDepleted", () => stack.events.emit("coordinatorPoolDepleted"));

		await layer.open();
	}

	stack.state = Stack.STATE.OPENED;
	stack.events.emit("open");
	stack.logger?.info("Open");
};
