import { defaults } from "@technically/lodash";
import { Socket as NodeUdpSocket, RemoteInfo } from "dgram";
import EventEmitter from "events";
import { BOOTSTRAP_ADDRESSES } from "../../utilities/bootstrapAddresses";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { Cache } from "../Cache";
import { Endpoint } from "../Endpoint/Codec";
import { Nat } from "../Endpoint/Constant";
import { EventEmitterOptions } from "../EventEmitter";
import { Message } from "../Message";
import { MessageBodyType } from "../Message/BodyCodec";
import { awaitSessionResponse, AwaitSessionResponseOptions, ResponseBodyAssertions } from "./methods/awaitResponse";
import { bootstrapSession } from "./methods/bootstrap";
import { bootstrapSessionAddressPool } from "./methods/bootstrapAddressPool";
import { closeSession } from "./methods/close";
import { getSessionExternalAddress } from "./methods/getExternalAddress";
import { handleSessionBuffer } from "./methods/handleBuffer";
import { handleSessionMessage } from "./methods/handleMessage";
import { handleSessionPing } from "./methods/handlePing";
import { handleSessionPunch } from "./methods/handlePunch";
import { handleSessionReflect } from "./methods/handleReflect";
import { handleSessionSample } from "./methods/handleSample";
import { healthcheckSessionAddressPool } from "./methods/healthcheckAddressPool";
import { healthcheckSessionEndpoint } from "./methods/healthcheckEndpoint";
import { isValidSessionPoolAddress } from "./methods/isValidPoolAddress";
import { openSession } from "./methods/open";
import { pageSessionAddresses } from "./methods/pageAddresses";
import { probeSessionExternalAddress } from "./methods/probeExternalAddress";
import { sampleSessionAddressPool } from "./methods/sampleAddressPool";
import { searchSessionAddresses } from "./methods/searchAddresses";
import { sendSessionMessage } from "./methods/sendMessage";
import { sendSessionNoop } from "./methods/sendNoop";
import { sendSessionPing } from "./methods/sendPing";
import { sendSessionPunch } from "./methods/sendPunch";
import { sendSessionPut } from "./methods/sendPut";
import { sendSessionReflect } from "./methods/sendReflect";
import { sendSessionSample } from "./methods/sendSample";
import { sendSessionUdpMessage } from "./methods/sendUdpMessage";

export namespace Session {
	export interface EventMap {
		close: [];
		data: [data: Uint8Array, context: Context];
		endpoint: [previousEndpoint: Endpoint | undefined, nextEndpoint: Endpoint | undefined];
		error: [error: unknown];
		message: [message: Message, context: Context];
		open: [];
	}

	export interface Options extends AwaitSessionResponseOptions, EventEmitterOptions {
		bootstrapAddresses: Array<Address>;
		cacheSize: number;
		concurrency: number;
		depth: number;
		healthcheckIntervalMs: number;
		isDiscoveryEnabled: boolean;
		logger?: Logger;
		natType?: Nat;
		poolSize: number;
		udpSocket: Session.UdpSocket;
	}

	export interface Context {
		buffer: Uint8Array;
		remoteInfo: RemoteInfo;
		remoteAddress: Address;
		session: Session;
	}

	export type UdpSocket = Pick<NodeUdpSocket, "address" | "close" | "on" | "removeListener" | "send" | "unref">;

	export type State = 0 | 1;
}

export class Session {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public cache: { pool: Cache<Address>; probe: Cache<undefined>; punch: Cache<undefined> };
	public events: EventEmitter<Session.EventMap>;
	public healthcheckAddressPoolInterval?: NodeJS.Timeout;
	public healthcheckEndpointInterval?: NodeJS.Timeout;
	public isBootstrappingAddressPool = false;
	public isHealthcheckingAddressPool = false;
	public isHealthcheckingEndpoint = false;
	public localAddress: Address;
	public logger?: Logger;
	public options: Session.Options;
	public responseListenerMap = new Map<string, { abort: AbortController; listener: (message: Message, context: Session.Context) => any }>();
	public udpSocket: Session.UdpSocket;
	public state: Session.State = Session.STATE.CLOSED;

	constructor(options: RequiredProperties<Session.Options, "udpSocket">) {
		const defaultOptions = defaults(options, {
			bootstrapAddresses: BOOTSTRAP_ADDRESSES,
			cacheSize: 10_000,
			concurrency: 3,
			depth: 10,
			healthcheckIntervalMs: 60_000,
			isDiscoveryEnabled: true,
			poolSize: 100,
		});

		this.localAddress = Address.fromRemoteInfo(defaultOptions.udpSocket.address());

		this.cache = {
			pool: new Cache(defaultOptions.healthcheckIntervalMs * 2, defaultOptions.poolSize),
			probe: new Cache(3_600_000, defaultOptions.cacheSize),
			punch: new Cache(3_000, defaultOptions.cacheSize),
		};
		this.events = new EventEmitter(defaultOptions);
		this.logger = wrapLogger(defaultOptions.logger, `DICE SESSION ${this.localAddress.toString()}`);
		this.options = defaultOptions;
		this.udpSocket = defaultOptions.udpSocket;
	}

	awaitResponse = async <T extends MessageBodyType = MessageBodyType>(assertions: ResponseBodyAssertions<T>, options?: AwaitSessionResponseOptions): Promise<Message<T>> => {
		return awaitSessionResponse(this, assertions, options);
	};

	bootstrap = bootstrapSession.bind(this, this);
	close = closeSession.bind(this, this);
	open = openSession.bind(this, this);
	sendMessage = sendSessionMessage.bind(this, this);
	sendUdpMessage = sendSessionUdpMessage.bind(this, this);

	bootstrapAddressPool = bootstrapSessionAddressPool.bind(this, this);
	healthcheckAddressPool = healthcheckSessionAddressPool.bind(this, this);
	isValidPoolAddress = isValidSessionPoolAddress.bind(this, this);
	sampleAddressPool = sampleSessionAddressPool.bind(this, this);

	pageAddresses = pageSessionAddresses.bind(this, this);
	searchAddresses = searchSessionAddresses.bind(this, this);

	getExternalAddress = getSessionExternalAddress.bind(this, this);
	healthcheckEndpoint = healthcheckSessionEndpoint.bind(this, this);
	probeExternalAddress = probeSessionExternalAddress.bind(this, this);

	handleBuffer = handleSessionBuffer.bind(this, this);
	handleMessage = handleSessionMessage.bind(this, this);
	handlePing = handleSessionPing.bind(this, this);
	handlePunch = handleSessionPunch.bind(this, this);
	handleReflect = handleSessionReflect.bind(this, this);
	handleSample = handleSessionSample.bind(this, this);

	noop = sendSessionNoop.bind(this, this);
	ping = sendSessionPing.bind(this, this);
	punch = sendSessionPunch.bind(this, this);
	put = sendSessionPut.bind(this, this);
	reflect = sendSessionReflect.bind(this, this);
	sample = sendSessionSample.bind(this, this);

	sessionListeners = {
		messageListener: (message: Message, context: Session.Context) => {
			this.handleMessage(message, context);
		},
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	udpSocketListeners = {
		messageListener: (message: Uint8Array, remoteInfo: RemoteInfo) => {
			this.handleBuffer(message, {
				remoteInfo,
			});
		},
	};

	private _endpoint?: Endpoint;

	get endpoint(): Endpoint | undefined {
		return this._endpoint;
	}

	set endpoint(nextEndpoint: Endpoint | undefined) {
		const previousEndpoint = this.endpoint;

		this._endpoint = nextEndpoint;

		if (previousEndpoint?.key !== nextEndpoint?.key) {
			this.events.emit("endpoint", previousEndpoint, nextEndpoint);
		}
	}
}
