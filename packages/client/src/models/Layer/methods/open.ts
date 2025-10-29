import { Layer } from "..";

export const openOverlay = async (layer: Layer): Promise<void> => {
	if (layer.state === Layer.STATE.OPENED) return;

	layer.logger?.info("Opening");

	layer.socket.on("message", layer.socketListeners.messageListener);

	layer.events.on("diceMessage", layer.overlayListeners.diceMessageListener);
	layer.events.on("error", layer.overlayListeners.errorListener);

	layer.healthcheckInterval = setInterval(() => layer.healthcheck(), layer.options.healthcheckIntervalMs);

	layer.state = Layer.STATE.OPENED;
	layer.events.emit("open");
	layer.logger?.info("Open");
};
