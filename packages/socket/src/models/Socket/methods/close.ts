import { Socket } from "..";

export const closeSocket = (socket: Socket): void => {
	socket.logger?.info("Closing");

	if (socket.healthcheckNodeInterval) clearInterval(socket.healthcheckNodeInterval);
	if (socket.healthcheckOverlayInterval) clearInterval(socket.healthcheckOverlayInterval);

	socket.rawSocket.removeListener("message", socket.rawSocketListeners.messageListener);
	socket.rawSocket.close();

	socket.removeListener("message", socket.socketListeners.messageListener);
	socket.removeListener("error", socket.socketListeners.errorListener);

	socket.state = Socket.STATE.CLOSED;
	socket.emit("close");
	socket.logger?.info("Closed");
};
