import ipaddr from "ipaddr.js";
import { Session } from "..";
import { Address } from "../../Address";
import { Message } from "../../Message";

export const sendSessionUdpMessage = async (session: Session, address: Address, message: Message): Promise<void> => {
	session.logger?.debug(`Sending ${message.body.type} via ${address.toString()}`);

	if (address.key === session.endpoint?.address.key) {
		session.events.emit("message", message, {
			buffer: message.buffer,
			remoteAddress: address,
			remoteInfo: address.toRemoteInfo(message.byteLength),
			session,
		});

		return;
	}

	await new Promise<void>((resolve, reject) =>
		session.udpSocket.send(message.buffer, address.port, ipaddr.fromByteArray([...address.ip.address.values()]).toString(), (error, byteLength) => {
			if (error) {
				session.events.emit("error", error);

				return reject(error);
			}

			session.logger?.debug(`Sent ${byteLength} bytes`);

			resolve();
		})
	);
};
