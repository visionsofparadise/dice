import { secp256k1 } from "@noble/curves/secp256k1";
import { base32crockford } from "@scure/base";
import { defaults } from "@technically/lodash";
import { Socket as NodeUdpSocket, RemoteInfo } from "dgram";
import EventEmitter from "events";
import { BOOTSTRAP_NODES } from "../../utilities/bootstrapNodes";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { Cache } from "../Cache";
import { Endpoint } from "../Endpoint/Codec";
import { Nat } from "../Endpoint/Constant";
import { EventEmitterOptions } from "../EventEmitter";
import { Keys } from "../Keys";
import { Message } from "../Message";
import { NetworkAddress } from "../NetworkAddress";
import { Node } from "../Node";
import { Overlay } from "../Overlay";
import { awaitSocketResponse, AwaitSocketResponseOptions, ResponseBodyAssertions, ResponseBodyType } from "./methods/awaitResponse";
import { bootstrapSocket } from "./methods/bootstrap";
import { bootstrapSocketOverlay } from "./methods/bootstrapOverlay";
import { closeSocket } from "./methods/close";
import { findSocketNode } from "./methods/findNode";
import { findSocketNodes } from "./methods/findNodes";
import { getSocketExternalAddress } from "./methods/getExternalAddress";
import { getSocketRelay } from "./methods/getRelay";
import { handleSocketBuffer } from "./methods/handleBuffer";
import { handleSocketListNodes } from "./methods/handleListNodes";
import { handleSocketMessage } from "./methods/handleMessage";
import { handleSocketMessageNodes } from "./methods/handleMessageNodes";
import { handleSocketPing } from "./methods/handlePing";
import { handleSocketPunch } from "./methods/handlePunch";
import { handleSocketReflect } from "./methods/handleReflect";
import { handleSocketRelay } from "./methods/handleRelay";
import { handleSocketResponse } from "./methods/handleResponse";
import { handleSocketReveal } from "./methods/handleReveal";
import { healthcheckSocketNode } from "./methods/healthcheckNode";
import { healthcheckSocketOverlay } from "./methods/healthcheckOverlay";
import { isSocketEndpointNat1 } from "./methods/isSocketEndpointNat1";
import { iterateSocketNodes } from "./methods/iterateNodes";
import { openSocket } from "./methods/open";
import { routeSocketMessage } from "./methods/routeMessage";
import { searchSocketNode } from "./methods/searchNode";
import { sendSocketListNodes } from "./methods/sendListNodes";
import { sendSocketMessage } from "./methods/sendMessage";
import { sendSocketNoop } from "./methods/sendNoop";
import { sendSocketPing } from "./methods/sendPing";
import { sendSocketPunch } from "./methods/sendPunch";
import { sendSocketPutData } from "./methods/sendPutData";
import { sendSocketReflect } from "./methods/sendReflect";
import { sendSocketReveal } from "./methods/sendReveal";
import { sendSocketUdpMessage } from "./methods/sendUdpMessage";

export namespace Socket {
	export interface EventMap {
		close: [];
		data: [Uint8Array, DataContext];
		error: [unknown];
		localNode: [Node, Node];
		message: [Message, MessageContext];
		open: [];
		remoteNode: [Node];
	}

	export interface Options extends AwaitSocketResponseOptions, EventEmitterOptions {
		bootstrapNodes: Array<Node>;
		cacheSize: number;
		concurrency: number;
		generation: number;
		healthcheckIntervalMs: number;
		logger?: Logger;
		natType?: Nat;
		privateKey: Uint8Array;
		udpSockets: Array<Socket.UdpSocket>;
	}

	export interface MessageContext {
		local: {
			endpoint: Endpoint;
			udpSocket: Socket.UdpSocket;
		};
		remote: {
			info: RemoteInfo;
			networkAddress: NetworkAddress;
		};
		socket: Socket;
	}

	export interface DataContext extends MessageContext {
		message: Message;
	}

	export type UdpSocket = Pick<NodeUdpSocket, "address" | "close" | "on" | "removeListener" | "send" | "unref">;
	export type State = 0 | 1;
}

export class Socket extends EventEmitter<Socket.EventMap> {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public cache: { contact: Cache<undefined>; punch: Cache<undefined>; reveal: Cache<NetworkAddress> };
	public closeController: AbortController;
	public externalUdpSocketMap = new Map<string, Socket.UdpSocket>();
	public healthcheckNodeInterval?: NodeJS.Timeout;
	public healthcheckOverlayInterval?: NodeJS.Timeout;
	public internalEndpointMap = new Map<string, Endpoint>();
	public isBootstrappingOverlay = false;
	public isHealthcheckingNode = false;
	public isHealthcheckingOverlay = false;
	public keys: Keys;
	public logger?: Logger;
	public options: Socket.Options;
	public overlay: Overlay;
	public responseListenerMap = new Map<string, (message: Message, context: Socket.MessageContext) => any>();
	public state: Socket.State = Socket.STATE.CLOSED;
	public udpSockets: Array<Socket.UdpSocket>;

	constructor(options?: Partial<Socket.Options>) {
		const defaultOptions = defaults(options, {
			bootstrapNodes: BOOTSTRAP_NODES,
			cacheSize: 10_000,
			concurrency: 3,
			generation: 0,
			healthcheckIntervalMs: 10_000,
			privateKey: secp256k1.utils.randomPrivateKey(),
			udpSockets: [],
		});

		super(defaultOptions);

		this.cache = {
			contact: new Cache(3_600_000, defaultOptions.cacheSize),
			punch: new Cache(3_000, defaultOptions.cacheSize),
			reveal: new Cache(3_000, defaultOptions.cacheSize),
		};
		this.closeController = new AbortController();
		this.keys = new Keys({ privateKey: defaultOptions.privateKey });
		this.logger = wrapLogger(defaultOptions.logger, `DICE SOCKET ${base32crockford.encode(this.keys.publicKey).slice(-4)}`);
		this._node = Node.create(
			{
				generation: defaultOptions.generation,
			},
			this.keys
		);
		this.node = this._node;
		this.options = defaultOptions;
		this.overlay = new Overlay({
			bootstrapNodes: this.options.bootstrapNodes,
			logger: this.options.logger,
			keys: this.keys,
		});
		this.udpSockets = defaultOptions.udpSockets;

		this.setMaxListeners(Infinity);
	}

	awaitResponse = async <T extends ResponseBodyType>(assertions: ResponseBodyAssertions<T>, options?: AwaitSocketResponseOptions): Promise<Message<T>> => {
		return awaitSocketResponse(this, assertions, options);
	};

	bootstrap = bootstrapSocket.bind(this, this);
	close = closeSocket.bind(this, this);
	open = openSocket.bind(this, this);
	route = routeSocketMessage.bind(this, this);
	send = sendSocketMessage.bind(this, this);
	sendUdp = sendSocketUdpMessage.bind(this, this);

	getExternalAddress = getSocketExternalAddress.bind(this, this);
	healthcheckNode = healthcheckSocketNode.bind(this, this);
	isSocketEndpointNat1 = isSocketEndpointNat1.bind(this, this);

	bootstrapOverlay = bootstrapSocketOverlay.bind(this, this);
	findNode = findSocketNode.bind(this, this);
	findNodes = findSocketNodes.bind(this, this);
	getRelay = getSocketRelay.bind(this, this);
	healthcheckOverlay = healthcheckSocketOverlay.bind(this, this);
	iterateNodes = iterateSocketNodes.bind(this, this);
	searchNode = searchSocketNode.bind(this, this);

	handleBuffer = handleSocketBuffer.bind(this, this);
	handleMessage = handleSocketMessage.bind(this, this);
	handleMessageNodes = handleSocketMessageNodes.bind(this, this);
	handleListNodes = handleSocketListNodes.bind(this, this);
	handlePing = handleSocketPing.bind(this, this);
	handlePunch = handleSocketPunch.bind(this, this);
	handleReflect = handleSocketReflect.bind(this, this);
	handleRelay = handleSocketRelay.bind(this, this);
	handleResponse = handleSocketResponse.bind(this, this);
	handleReveal = handleSocketReveal.bind(this, this);

	listNodes = sendSocketListNodes.bind(this, this);
	noop = sendSocketNoop.bind(this, this);
	ping = sendSocketPing.bind(this, this);
	punch = sendSocketPunch.bind(this, this);
	putData = sendSocketPutData.bind(this, this);
	reflect = sendSocketReflect.bind(this, this);
	reveal = sendSocketReveal.bind(this, this);

	rawSocketListeners = {
		messageListener: (buffer: Uint8Array, remoteInfo: RemoteInfo, udpSocket: Socket.UdpSocket) => {
			this.handleBuffer(buffer, { remote: { info: remoteInfo }, udpSocket });
		},
	};

	socketListeners = {
		messageListener: async (message: Message, context: Socket.MessageContext) => {
			this.handleMessage(message, context);
		},
		errorListener: (error: unknown) => {
			this.logger?.error(error);
		},
	};

	private _node: Node;

	get node() {
		return this._node;
	}

	set node(nextNode: Node) {
		const previousNode = this.node;

		this._node = nextNode;

		this.emit("localNode", previousNode, nextNode);
	}
}
