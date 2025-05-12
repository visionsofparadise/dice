import { Socket } from "..";

export const bootstrapSocket = async (socket: Socket): Promise<void> => {
	try {
		await socket.healthcheckNode();
		await socket.healthcheckOverlay();
	} catch (error) {
		socket.emit("error", error);
	}
};
