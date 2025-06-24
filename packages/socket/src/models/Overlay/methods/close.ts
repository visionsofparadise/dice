import { Overlay } from "..";

export const closeOverlay = (overlay: Overlay): void => {
	overlay.networkAddressSet.clear();
	overlay.table.clear();

	overlay.state = Overlay.STATE.CLOSED;
	overlay.emit("close");
};
