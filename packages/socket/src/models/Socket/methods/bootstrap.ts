import { Socket } from "..";

export const bootstrapSocket = async (socket: Socket): Promise<void> => {
	await socket.healthcheckNode();
	await socket.healthcheckOverlay();
};
