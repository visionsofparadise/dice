import { Overlay } from "..";

export const openOverlay = async (overlay: Overlay, isBootstrapping = true): Promise<void> => {
	if (overlay.state === Overlay.STATE.OPENED) return;

	overlay.logger?.info("Opening");

	overlay.socket.on("message", overlay.socketListeners.messageListener);

	overlay.events.on("message", overlay.overlayListeners.messageListener);
	overlay.events.on("error", overlay.overlayListeners.errorListener);

	overlay.healthcheckInterval = setInterval(() => overlay.healthcheck(), overlay.options.healthcheckIntervalMs);

	overlay.state = Overlay.STATE.OPENED;
	overlay.events.emit("open");
	overlay.logger?.info("Open");

	if (isBootstrapping) await overlay.healthcheck();
};
