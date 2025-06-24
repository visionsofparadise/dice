import { Socket } from "..";

export const closeSocket = (socket: Socket): void => {
	if (socket.state === Socket.STATE.CLOSED) return;

	socket.logger?.info("Closing");

	clearInterval(socket.healthcheckNodeInterval);
	clearInterval(socket.healthcheckOverlayInterval);

	for (const udpSocket of socket.udpSockets) {
		udpSocket.removeListener("message", socket.rawSocketListeners.messageListener);
	}

	socket.removeListener("message", socket.socketListeners.messageListener);
	socket.removeListener("error", socket.socketListeners.errorListener);

	socket.closeController.abort();
	socket.overlay.close();

	socket.state = Socket.STATE.CLOSED;
	socket.emit("close");
	socket.logger?.info("Closed");
};
