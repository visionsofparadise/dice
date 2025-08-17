import { Socket } from "..";

export const closeSocket = (socket: Socket): void => {
	if (socket.state === Socket.STATE.CLOSED) return;

	socket.logger?.info("Closing");

	socket.session.events.removeListener("data", socket.sessionListeners.dataListener);
	socket.session.close();

	socket.state = Socket.STATE.CLOSED;
	socket.events.emit("close");
	socket.logger?.info("Closed");
};
