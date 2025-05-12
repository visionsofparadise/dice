import { secp256k1 } from "@noble/curves/secp256k1";
import { base58 } from "@scure/base";
import { defaults } from "@technically/lodash";
import EventEmitter from "events";
import { BOOTSTRAP_NODES } from "../../utilities/bootstrapNodes";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { IpType } from "../Address/Constant";
import { EventEmitterOptions } from "../EventEmitter";
import { Keys } from "../Keys";
import { Node } from "../Node/Codec";
import { OverlayTable } from "../OverlayTable";
import { addOverlayNode } from "./methods/add";
import { closeOverlay } from "./methods/close";
import { putOverlayNode } from "./methods/put";
import { removeOverlayNode } from "./methods/remove";
import { sampleOverlayNodes } from "./methods/sample";
import { updateOverlayNode } from "./methods/update";

export namespace Overlay {
	export interface EventMap {
		add: [Node];
		close: [];
		open: [];
		remove: [Node];
		update: [Node, Node];
	}

	export interface Options extends OverlayTable.Options, EventEmitterOptions {
		bootstrapNodes: Array<Node>;
		ipType: IpType;
		logger?: Logger;
		privateKey: Uint8Array;
	}

	export type State = 0 | 1;
}

export class Overlay extends EventEmitter<Overlay.EventMap> {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public addressSet = new Set<string>();
	public healthcheckInterval?: NodeJS.Timeout;
	public keys: Keys;
	public logger?: Logger;
	public options: Overlay.Options;
	public state: Overlay.State = Overlay.STATE.CLOSED;
	public table: OverlayTable;

	constructor(options: Partial<Overlay.Options>) {
		const defaultOptions = defaults(
			{ ...options },
			{
				bootstrapNodes: BOOTSTRAP_NODES,
				ipType: IpType.IPV4,
				privateKey: secp256k1.utils.randomPrivateKey(),
			}
		);

		super(defaultOptions);

		this.keys = new Keys({ privateKey: defaultOptions.privateKey });
		this.logger = wrapLogger(defaultOptions.logger, `OVERLAY ${base58.encode(this.keys.publicKey).slice(-4)}`);
		this.options = defaultOptions;
		this.table = new OverlayTable(this.keys.publicKey, defaultOptions);

		this.state = Overlay.STATE.OPENED;
		this.emit("open");
	}

	add = addOverlayNode.bind(this, this);
	close = closeOverlay.bind(this, this);
	put = putOverlayNode.bind(this, this);
	remove = removeOverlayNode.bind(this, this);
	sample = sampleOverlayNodes.bind(this, this);
	update = updateOverlayNode.bind(this, this);
}
