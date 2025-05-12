import { Socket } from "..";

export const openSocket = (socket: Socket): void => {
	socket.logger?.info("Opening");

	socket.rawSocket.bind(socket.localAddress.port, socket.localAddress.ip.value);
	socket.rawSocket.on("message", socket.rawSocketListeners.messageListener);

	socket.on("message", socket.socketListeners.messageListener);
	socket.on("error", socket.socketListeners.errorListener);

	socket.healthcheckNodeInterval = setInterval(() => socket.healthcheckNode(), socket.options.healthcheckIntervalMs);
	socket.healthcheckOverlayInterval = setInterval(() => socket.healthcheckOverlay(), socket.options.healthcheckIntervalMs);

	socket.state = Socket.STATE.OPENED;
	socket.emit("open");
	socket.logger?.info("Open");
};
