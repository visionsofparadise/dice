import { secp256k1 } from "@noble/curves/secp256k1";
import { base58 } from "@scure/base";
import { defaults } from "@technically/lodash";
import { createSocket, RemoteInfo, Socket as UdpSocket, SocketOptions as UdpSocketOptions } from "dgram";
import EventEmitter from "events";
import portControl from "nat-puncher";
import { BOOTSTRAP_NODES } from "../../utilities/bootstrapNodes";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { Address } from "../Address";
import { Ip } from "../Address/Codec";
import { IP_TYPE_UDP_TYPE_MAPPING, IpType } from "../Address/Constant";
import { Cache } from "../Cache";
import { EventEmitterOptions } from "../EventEmitter";
import { Keys } from "../Keys";
import { Message } from "../Message";
import { Node } from "../Node/Codec";
import { NatType } from "../Node/Constant";
import { Nat1Node } from "../Node/Nat1";
import { Overlay } from "../Overlay";
import { OverlayTable } from "../OverlayTable";
import { awaitSocketResponse, AwaitSocketResponseOptions } from "./methods/awaitResponse";
import { bootstrapSocket } from "./methods/bootstrap";
import { bootstrapSocketNat1Node } from "./methods/bootstrapNat1Node";
import { bootstrapSocketNat3Node } from "./methods/bootstrapNat3Node";
import { bootstrapSocketNat4Node } from "./methods/bootstrapNat4Node";
import { bootstrapSocketNode } from "./methods/bootstrapNode";
import { bootstrapSocketOverlay } from "./methods/bootstrapOverlay";
import { closeSocket } from "./methods/close";
import { createSocketCacheKey } from "./methods/createCacheKey";
import { findSocketNode } from "./methods/findNode";
import { findSocketNodes } from "./methods/findNodes";
import { getSocketExternalAddress } from "./methods/getExternalAddress";
import { handleSocketBuffer } from "./methods/handleBuffer";
import { handleSocketListNodes } from "./methods/handleListNodes";
import { handleSocketMessage } from "./methods/handleMessage";
import { handleSocketPing } from "./methods/handlePing";
import { handleSocketPunch } from "./methods/handlePunch";
import { handleSocketReflect } from "./methods/handleReflect";
import { healthcheckSocketNode } from "./methods/healthcheckNode";
import { healthcheckSocketOverlay } from "./methods/healthcheckOverlay";
import { iterateSocketNodes } from "./methods/iterateNodes";
import { openSocket } from "./methods/open";
import { processSocketNode } from "./methods/processNode";
import { routeSocketMessage } from "./methods/route";
import { searchSocketNodes } from "./methods/searchNode";
import { sendSocketListNodes } from "./methods/sendListNodes";
import { sendSocketMessage } from "./methods/sendMessage";
import { sendSocketNoop } from "./methods/sendNoop";
import { sendSocketPing } from "./methods/sendPing";
import { sendSocketPunch } from "./methods/sendPunch";
import { sendSocketPutData } from "./methods/sendPutData";
import { sendSocketReflect } from "./methods/sendReflect";
import { updateSocketRelayNode } from "./methods/updateRelayNode";

export namespace Socket {
	export interface EventMap {
		close: [];
		data: [Uint8Array, DataContext];
		error: [unknown];
		message: [Message, MessageContext];
		node: [Node];
		open: [];
	}

	export interface Options extends EventEmitterOptions, Partial<Overlay.Options>, Partial<OverlayTable.Options> {
		bootstrapNodes: Array<Nat1Node>;
		cacheSize: number;
		concurrency: number;
		createSocket: (options: UdpSocketOptions) => Socket.RawSocket;
		defaultAwaitResponseOptions?: Partial<AwaitSocketResponseOptions>;
		generation: number;
		healthcheckIntervalMs: number;
		ip: Ip;
		isPortMappingDisabled: boolean;
		logger?: Logger;
		natType?: NatType;
		port: number;
		privateKey: Uint8Array;
	}

	export interface MessageContext {
		remoteInfo: RemoteInfo;
		socket: Socket;
	}

	export interface DataContext extends MessageContext {
		message: Message;
	}

	export type RawSocket = Pick<UdpSocket, "bind" | "close" | "on" | "removeListener" | "send">;
	export type State = 0 | 1;
}

export class Socket extends EventEmitter<Socket.EventMap> {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public cache: { contact: Cache; health: Cache; punch: Cache };
	public healthcheckNodeInterval?: NodeJS.Timeout;
	public healthcheckOverlayInterval?: NodeJS.Timeout;
	public isBootstrappingNode = false;
	public isBootstrappingOverlay = false;
	public isHealthcheckingNode = false;
	public isHealthcheckingOverlay = false;
	public keys: Keys;
	public localAddress: Address;
	public logger?: Logger;
	public node: Node;
	public options: Socket.Options;
	public overlay: Overlay;
	public portControl: any;
	public rawSocket: Socket.RawSocket;
	public state: Socket.State = Socket.STATE.CLOSED;

	constructor(options?: Partial<Socket.Options>) {
		const defaultOptions = defaults(
			{ ...options },
			{
				bootstrapNodes: BOOTSTRAP_NODES,
				cacheSize: 10_000,
				concurrency: 3,
				createSocket,
				generation: 0,
				healthcheckIntervalMs: 10_000,
				ip: {
					type: IpType.IPV4,
					value: "127.0.0.1",
				},
				isPortMappingDisabled: false,
				port: 6173,
				privateKey: secp256k1.utils.randomPrivateKey(),
			}
		);

		super(defaultOptions);

		this.cache = {
			contact: new Cache(3_600_000, defaultOptions.cacheSize),
			health: new Cache(3_000, defaultOptions.cacheSize),
			punch: new Cache(3_000, defaultOptions.cacheSize),
		};
		this.keys = new Keys({ privateKey: defaultOptions.privateKey });
		this.localAddress = new Address({
			ip: defaultOptions.ip,
			port: defaultOptions.port,
		});
		this.logger = wrapLogger(defaultOptions.logger, `SOCKET ${base58.encode(this.keys.publicKey).slice(-4)}`);
		this.node = Nat1Node.create(
			{
				address: this.localAddress,
				generation: defaultOptions.generation,
				isDisabled: true,
			},
			this.keys
		);
		this.options = defaultOptions;
		this.overlay = new Overlay({
			...this.options,
			ipType: this.localAddress.ip.type,
		});
		this.portControl = portControl;
		this.rawSocket = this.options.createSocket({ type: IP_TYPE_UDP_TYPE_MAPPING[this.localAddress.ip.type], reuseAddr: true, reusePort: true });

		this.setMaxListeners(Infinity);
	}

	awaitResponse = awaitSocketResponse.bind(this, this);
	bootstrap = bootstrapSocket.bind(this, this);
	close = closeSocket.bind(this, this);
	createCacheKey = createSocketCacheKey.bind(this, this);
	open = openSocket.bind(this, this);
	route = routeSocketMessage.bind(this, this);
	send = sendSocketMessage.bind(this, this);

	bootstrapNat1Node = bootstrapSocketNat1Node.bind(this, this);
	bootstrapNat3Node = bootstrapSocketNat3Node.bind(this, this);
	bootstrapNat4Node = bootstrapSocketNat4Node.bind(this, this);
	bootstrapNode = bootstrapSocketNode.bind(this, this);
	getExternalAddress = getSocketExternalAddress.bind(this, this);
	healthcheckNode = healthcheckSocketNode.bind(this, this);
	processNode = processSocketNode.bind(this, this);
	updateRelayNode = updateSocketRelayNode.bind(this, this);

	bootstrapOverlay = bootstrapSocketOverlay.bind(this, this);
	findNode = findSocketNode.bind(this, this);
	findNodes = findSocketNodes.bind(this, this);
	healthcheckOverlay = healthcheckSocketOverlay.bind(this, this);
	iterateNodes = iterateSocketNodes.bind(this, this);
	searchNode = searchSocketNodes.bind(this, this);

	handleBuffer = handleSocketBuffer.bind(this, this);
	handleMessage = handleSocketMessage.bind(this, this);
	handleListNodes = handleSocketListNodes.bind(this, this);
	handlePing = handleSocketPing.bind(this, this);
	handlePunch = handleSocketPunch.bind(this, this);
	handleReflect = handleSocketReflect.bind(this, this);

	listNodes = sendSocketListNodes.bind(this, this);
	noop = sendSocketNoop.bind(this, this);
	ping = sendSocketPing.bind(this, this);
	punch = sendSocketPunch.bind(this, this);
	putData = sendSocketPutData.bind(this, this);
	reflect = sendSocketReflect.bind(this, this);

	rawSocketListeners = {
		messageListener: (buffer: Uint8Array, remoteInfo: RemoteInfo) => {
			this.handleBuffer(buffer, remoteInfo);
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
}
