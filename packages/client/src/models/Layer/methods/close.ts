import { Layer } from "..";

export const closeOverlay = (layer: Layer): void => {
	if (layer.state === Layer.STATE.CLOSED) return;

	layer.logger?.info("Closing");

	clearInterval(layer.healthcheckInterval);

	layer.socket.removeListener("message", layer.socketListeners.messageListener);

	layer.events.removeListener("diceMessage", layer.overlayListeners.diceMessageListener);
	layer.events.removeListener("error", layer.overlayListeners.errorListener);

	layer.correlator.abortAll();

	layer.state = Layer.STATE.CLOSED;
	layer.events.emit("close");
	layer.logger?.info("Closed");
};
