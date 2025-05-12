import { Socket } from "..";
import { Address } from "../../Address";

export const createSocketCacheKey = (socket: Socket, remoteAddress: Address) => {
	return `${socket.node.address.toString()}-${remoteAddress.toString()}`;
};
