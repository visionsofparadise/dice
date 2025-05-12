import { RemoteInfo } from "dgram";
import { Socket } from "..";
import { MessageCodec } from "../../Message/Codec";

export const handleSocketBuffer = async (socket: Socket, buffer: Uint8Array, remoteInfo: RemoteInfo) => {
	try {
		const message = MessageCodec.decode(buffer);

		socket.emit("message", message, { remoteInfo, socket });
	} catch (error) {
		socket.emit("error", error);
	}
};
