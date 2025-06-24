import { RemoteInfo } from "dgram";
import { compare } from "uint8array-tools";
import { Socket } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Nat } from "../../Endpoint/Constant";
import { MessageCodec } from "../../Message/Codec";
import { NetworkAddress } from "../../NetworkAddress";

export const handleSocketBuffer = async (socket: Socket, buffer: Uint8Array, context: { remote: { info: RemoteInfo }; udpSocket: Socket.UdpSocket }) => {
	try {
		socket.logger?.debug(`Received buffer ${buffer.byteLength} bytes`);

		const localEndpoint = socket.internalEndpointMap.get(NetworkAddress.fromRemoteInfo(context.udpSocket.address()).toString());

		if (!localEndpoint) return;

		if (compare(buffer.subarray(0, MAGIC_BYTES.byteLength), MAGIC_BYTES) !== 0) return;

		const remoteNetworkAddress = NetworkAddress.fromRemoteInfo(context.remote.info);

		if (localEndpoint.nat !== Nat.NAT4) {
			socket.cache.contact.set(`${localEndpoint.networkAddress.toString()}-${remoteNetworkAddress.toString()}`, undefined);
			socket.cache.punch.set(`${localEndpoint.networkAddress.toString()}-${remoteNetworkAddress.toString()}`, undefined);
		} else {
			socket.cache.contact.set(`${localEndpoint.networkAddress.family}-${remoteNetworkAddress.toString()}`, undefined);
		}

		const message = MessageCodec.decode(buffer);

		socket.logger?.debug(`Received message ${message.body.type} from ${remoteNetworkAddress.toString()}`);

		message.cache.buffer = buffer;

		socket.emit("message", message, {
			...context,
			local: {
				endpoint: localEndpoint,
				udpSocket: context.udpSocket,
			},
			remote: {
				...context.remote,
				networkAddress: remoteNetworkAddress,
			},
			socket,
		});
	} catch (error) {
		socket.emit("error", error);
	}
};
