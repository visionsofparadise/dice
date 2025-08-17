import { hex } from "@scure/base";
import { compare } from "uint8array-tools";
import { Session } from "..";
import { MAGIC_BYTES } from "../../../utilities/magicBytes";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Message } from "../../Message";

export const handleSessionMessage = async (session: Session, message: Message, context: Session.Context) => {
	try {
		const { remoteAddress } = context;

		session.logger?.debug(`Handling message ${message.body.type} from ${remoteAddress.toString()}`);

		if ("magicBytes" in message.body && compare(message.body.magicBytes, MAGIC_BYTES) !== 0) return;

		switch (message.body.type) {
			case "noop":
				break;
			case "ping": {
				await session.handlePing(message as Message<"ping">, context);

				break;
			}
			case "reflect": {
				await session.handleReflect(message as Message<"reflect">, context);

				break;
			}
			case "punch": {
				await session.handlePunch(message as Message<"punch">);

				break;
			}
			case "sample": {
				await session.handleSample(message as Message<"sample">, context);

				break;
			}
			case "put": {
				session.events.emit("data", message.body.data, context);

				break;
			}
			default: {
				if ("transactionId" in message.body) {
					const responseListener = session.responseListenerMap.get(hex.encode(message.body.transactionId))?.listener;

					if (responseListener) await responseListener(message, context);
				}

				break;
			}
		}

		if (!session.options.isDiscoveryEnabled) return;

		if (session.cache.pool.has(remoteAddress.key)) {
			session.cache.pool.set(remoteAddress.key, remoteAddress);
		} else {
			session.cache.punch.set(remoteAddress.key, undefined);

			if (!session.cache.pool.isFull && session.isValidPoolAddress(remoteAddress)) {
				await session.ping(new Nat1Endpoint({ address: remoteAddress }));
			}
		}
	} catch (error) {
		session.events.emit("error", error);
	}
};
