import EventEmitter from "events";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { EventEmitterOptions } from "../EventEmitter";
import { Session } from "../Session";
import { AwaitSessionResponseOptions } from "../Session/methods/awaitResponse";
import { closeSocket } from "./methods/close";
import { openSocket } from "./methods/open";
import { sendSocketData } from "./methods/send";

export namespace Socket {
	export interface EventMap {
		close: [];
		data: [data: Uint8Array, context: Session.Context];
		error: [error: unknown];
		open: [];
	}

	export interface Options extends RequiredProperties<Session.Options, "udpSocket">, AwaitSessionResponseOptions, EventEmitterOptions {
		logger?: Logger;
		udpSocket: Session.UdpSocket;
	}

	export type State = 0 | 1;
}

export class Socket {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public events: EventEmitter<Socket.EventMap>;
	public localAddress: Address;
	public logger?: Logger;
	public options: Socket.Options;
	public session: Session;
	public state: Socket.State = Socket.STATE.CLOSED;

	constructor(options: RequiredProperties<Socket.Options, "udpSocket">) {
		this.localAddress = Address.fromRemoteInfo(options.udpSocket.address());

		this.events = new EventEmitter(options);
		this.logger = wrapLogger(options.logger, `DICE SOCKET ${this.localAddress.toString()}`);
		this.options = options;
		this.session = new Session(options);
	}

	close = closeSocket.bind(this, this);
	open = openSocket.bind(this, this);
	send = sendSocketData.bind(this, this);

	sessionListeners = {
		dataListener: (data: Uint8Array, context: Session.Context) => this.events.emit("data", data, context),
	};
}
