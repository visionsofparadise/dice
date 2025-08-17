import { Socket } from "..";

export const openSocket = async (socket: Socket, isBootstrapping = true): Promise<void> => {
	if (socket.state === Socket.STATE.OPENED) return;

	socket.logger?.info("Opening");

	socket.session.events.on("data", socket.sessionListeners.dataListener);
	socket.session.open(isBootstrapping);

	socket.state = Socket.STATE.OPENED;
	socket.events.emit("open");
	socket.logger?.info("Open");
};
