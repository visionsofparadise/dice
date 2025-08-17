import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";

export const sendSocketData = async (socket: Socket, targetEndpoint: Endpoint, data: Uint8Array): Promise<void> => socket.session.put(targetEndpoint, data);
