import { Overlay } from "..";

export const closeOverlay = (overlay: Overlay): void => {
	if (overlay.state === Overlay.STATE.CLOSED) return;

	overlay.logger?.info("Closing");

	clearInterval(overlay.healthcheckInterval);

	overlay.socket.removeListener("message", overlay.socketListeners.messageListener);

	overlay.events.removeListener("message", overlay.overlayListeners.messageListener);
	overlay.events.removeListener("error", overlay.overlayListeners.errorListener);

	for (const { abort } of overlay.responseListenerMap.values()) abort.abort("close");

	overlay.state = Overlay.STATE.CLOSED;
	overlay.events.emit("close");
	overlay.logger?.info("Closed");
};
