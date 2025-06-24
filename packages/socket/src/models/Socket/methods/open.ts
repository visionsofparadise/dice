import { RemoteInfo } from "dgram";
import { Socket } from "..";

export const openSocket = async (socket: Socket, isBootstrapping = true): Promise<void> => {
	if (socket.state === Socket.STATE.OPENED) return;

	socket.logger?.info("Opening");

	for (const udpSocket of socket.udpSockets) {
		udpSocket.on("message", (buffer: Uint8Array, remoteInfo: RemoteInfo) => socket.rawSocketListeners.messageListener(buffer, remoteInfo, udpSocket));
	}

	socket.on("message", socket.socketListeners.messageListener);
	socket.on("error", socket.socketListeners.errorListener);

	socket.healthcheckNodeInterval = setInterval(() => socket.healthcheckNode(), socket.options.healthcheckIntervalMs);
	socket.healthcheckOverlayInterval = setInterval(() => socket.healthcheckOverlay(), socket.options.healthcheckIntervalMs);

	socket.state = Socket.STATE.OPENED;
	socket.emit("open");
	socket.logger?.info("Open");

	if (isBootstrapping) await socket.bootstrap();
};
