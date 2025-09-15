import { defaults } from "@technically/lodash";
import { RemoteInfo, Socket as UdpSocket } from "dgram";
import EventEmitter from "events";
import { BOOTSTRAP_ADDRESSES } from "../../utilities/bootstrapAddresses";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { Cache } from "../Cache";
import { Endpoint } from "../Endpoint";
import { EventEmitterOptions } from "../EventEmitter";
import { Message } from "../Message";
import { MessageBodyType } from "../Message/BodyCodec";
import { awaitClientResponse, AwaitClientResponseOptions, ResponseBodyAssertions } from "./methods/awaitResponse";
import { closeClient } from "./methods/close";
import { findClientAddresses } from "./methods/findAddresses";
import { handleClientAddress } from "./methods/handleAddress";
import { handleClientBuffer } from "./methods/handleBuffer";
import { handleClientList } from "./methods/handleList";
import { handleClientMessage } from "./methods/handleMessage";
import { handleClientPing } from "./methods/handlePing";
import { handleClientPunch } from "./methods/handlePunch";
import { handleClientReflection } from "./methods/handleReflection";
import { handleClientRelayPunch } from "./methods/handleRelayPunch";
import { healthcheckClient } from "./methods/healthcheck";
import { isValidClientAddress } from "./methods/isValidAddress";
import { openClient } from "./methods/open";
import { sendClientAddress, SendClientAddressOptions } from "./methods/sendAddress";
import { sendClientEndpoint } from "./methods/sendEndpoint";
import { sendClientList } from "./methods/sendList";
import { sendClientNoop } from "./methods/sendNoop";
import { sendClientPing } from "./methods/sendPing";
import { sendClientPunch } from "./methods/sendPunch";

export namespace Client {
	export interface EventMap {
		close: [];
		endpoint: [previousEndpoint: Endpoint, nextEndpoint: Endpoint];
		error: [error: unknown];
		message: [message: Message, context: Client.Context];
		open: [];
	}

	export interface Options extends AwaitClientResponseOptions, SendClientAddressOptions, EventEmitterOptions {
		bootstrapAddresses: Array<Address>;
		cacheSize: number;
		concurrency: number;
		depth: {
			minimum: number;
			maximum: number;
		};
		healthcheckIntervalMs: number;
		logger?: Logger;
		relayCount: number;
		socket: Client.Socket;
	}

	export interface Context {
		buffer: Uint8Array;
		remoteInfo: RemoteInfo;
		remoteAddress: Address;
		session: Client;
	}

	export type Socket = Pick<UdpSocket, "address" | "close" | "on" | "removeListener" | "send" | "unref">;

	export type State = 0 | 1;
}

export class Client {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public cache: { punchIn: Cache; punchOut: Cache };
	public events: EventEmitter<Client.EventMap>;
	public healthcheckInterval?: NodeJS.Timeout;
	public isHealthchecking = false;
	public localAddress: Address;
	public logger?: Logger;
	public options: Client.Options;
	public reflection?: {
		prefixes: Set<string>;
		address: Address;
	};
	public responseListenerMap = new Map<string, { abort: AbortController; listener: (message: Message, context: Client.Context) => any }>();
	public socket: Client.Socket;
	public state: Client.State = Client.STATE.CLOSED;

	constructor(options: RequiredProperties<Client.Options, "socket">) {
		const defaultOptions = defaults(options, {
			bootstrapAddresses: BOOTSTRAP_ADDRESSES,
			cacheSize: 10_000,
			concurrency: 3,
			depth: {
				minimum: 3,
				maximum: 10,
			},
			healthcheckIntervalMs: 60_000,
			relayCount: 9,
		});

		this.cache = {
			punchIn: new Cache(60_000, defaultOptions.cacheSize),
			punchOut: new Cache(30_000, defaultOptions.cacheSize),
		};
		this.events = new EventEmitter(defaultOptions);
		this.localAddress = Address.fromRemoteInfo(defaultOptions.socket.address());
		this.logger = wrapLogger(defaultOptions.logger, `DICE SESSION ${this.localAddress.toString()}`);
		this.options = defaultOptions;
		this.socket = defaultOptions.socket;
	}

	awaitResponse = async <T extends MessageBodyType = MessageBodyType>(assertions: ResponseBodyAssertions<T>, options?: AwaitClientResponseOptions): Promise<Message<T>> => {
		return awaitClientResponse(this, assertions, options);
	};

	close = closeClient.bind(this, this);
	healthcheck = healthcheckClient.bind(this, this);
	open = openClient.bind(this, this);

	findAddresses = findClientAddresses.bind(this, this);
	isValidAddress = isValidClientAddress.bind(this, this);
	sendAddress = sendClientAddress.bind(this, this);
	sendEndpoint = sendClientEndpoint.bind(this, this);

	handleAddress = handleClientAddress.bind(this, this);
	handleBuffer = handleClientBuffer.bind(this, this);
	handleList = handleClientList.bind(this, this);
	handleMessage = handleClientMessage.bind(this, this);
	handlePing = handleClientPing.bind(this, this);
	handlePunch = handleClientPunch.bind(this, this);
	handleReflection = handleClientReflection.bind(this, this);
	handleRelayPunch = handleClientRelayPunch.bind(this, this);

	list = sendClientList.bind(this, this);
	noop = sendClientNoop.bind(this, this);
	ping = sendClientPing.bind(this, this);
	punch = sendClientPunch.bind(this, this);

	clientListeners = {
		messageListener: (message: Message, context: Client.Context) => {
			this.handleMessage(message, context);
		},
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	socketListeners = {
		messageListener: (message: Uint8Array, remoteInfo: RemoteInfo) => {
			this.handleBuffer(message, {
				remoteInfo,
			});
		},
	};

	private _endpoint = new Endpoint();

	get endpoint(): Endpoint {
		return this._endpoint;
	}

	set endpoint(nextEndpoint: Endpoint) {
		if (nextEndpoint.key !== this.endpoint.key) {
			const previousEndpoint = this.endpoint;

			this._endpoint = nextEndpoint;

			this.events.emit("endpoint", previousEndpoint, nextEndpoint);
		}
	}
}
