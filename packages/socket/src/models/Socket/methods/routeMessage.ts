import { Socket } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat } from "../../Endpoint/Constant";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { DiceError } from "../../Error";
import { Message } from "../../Message";
import { RelayableBodyType } from "../../Message/BodyCodec";
import { RoutableTarget, Source, Target } from "../../Target/Codec";

export interface Route {
	source: Source<Endpoint>;
	target: Target<Nat1Endpoint | Nat3Endpoint>;
	message: Message;
}

export const routeSocketMessage = async (socket: Socket, source: Source, target: RoutableTarget, message: Message<RelayableBodyType>): Promise<Route> => {
	if (source.endpoint.networkAddress.family !== target.endpoint.networkAddress.family) {
		const relay = socket.getRelay(source, target, message);

		return {
			source,
			target: relay.target,
			message: relay.message,
		};
	}

	switch (target.endpoint.nat) {
		case Nat.NAT1: {
			return {
				source,
				target: {
					endpoint: target.endpoint,
				},
				message,
			};
		}
		case Nat.NAT3: {
			switch (source.endpoint.nat) {
				case Nat.NAT4: {
					const relay = socket.getRelay(source, target, message);

					return {
						source,
						target: relay.target,
						message: relay.message,
					};
				}
				default: {
					const udpSocket = socket.externalUdpSocketMap.get(source.endpoint.key);

					if (!udpSocket) throw new DiceError("Source endpoint udpSocket not found");

					await socket.punch(udpSocket, {
						diceAddress: target.diceAddress,
						endpoint: target.endpoint,
					});

					return {
						source,
						target: {
							endpoint: target.endpoint,
						},
						message,
					};
				}
			}
		}
		case Nat.NAT4: {
			switch (source.endpoint.nat) {
				case Nat.NAT1: {
					const networkAddress = await socket.reveal(
						{
							endpoint: source.endpoint,
						},
						{
							diceAddress: target.diceAddress,
							endpoint: target.endpoint,
						}
					);

					return {
						source,
						target: {
							endpoint: new Nat1Endpoint({
								networkAddress,
							}),
						},
						message,
					};
				}
				default: {
					const relay = socket.getRelay(source, target, message);

					return {
						source,
						target: relay.target,
						message: relay.message,
					};
				}
			}
		}
	}
};
