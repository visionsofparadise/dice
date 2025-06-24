import { base32crockford } from "@scure/base";
import { defaults } from "@technically/lodash";
import EventEmitter from "events";
import { BOOTSTRAP_NODES } from "../../utilities/bootstrapNodes";
import { Logger, wrapLogger } from "../../utilities/Logger";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { EventEmitterOptions } from "../EventEmitter";
import { Keys } from "../Keys";
import { Node } from "../Node";
import { OverlayTable } from "../OverlayTable";
import { addOverlayNode } from "./methods/add";
import { closeOverlay } from "./methods/close";
import { getOverlayRelay } from "./methods/getRelay";
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

	export interface Options extends EventEmitterOptions {
		bootstrapNodes: Array<Node>;
		logger?: Logger;
		keys: Keys;
	}

	export type State = 0 | 1;
}

export class Overlay extends EventEmitter<Overlay.EventMap> {
	static STATE = {
		CLOSED: 0,
		OPENED: 1,
	} as const;

	public keys: Keys;
	public logger?: Logger;
	public networkAddressSet = new Set<string>();
	public options: Overlay.Options;
	public state: Overlay.State = Overlay.STATE.CLOSED;
	public table: OverlayTable;

	constructor(options: RequiredProperties<Overlay.Options, "keys">) {
		const defaultOptions = defaults(
			{ ...options },
			{
				bootstrapNodes: BOOTSTRAP_NODES,
			}
		);

		super(defaultOptions);

		this.keys = defaultOptions.keys;
		this.logger = wrapLogger(defaultOptions.logger, `OVERLAY ${base32crockford.encode(this.keys.diceAddress).slice(-4)}`);
		this.options = defaultOptions;
		this.table = new OverlayTable(this.keys.diceAddress);

		this.state = Overlay.STATE.OPENED;
		this.emit("open");
	}

	add = addOverlayNode.bind(this, this);
	close = closeOverlay.bind(this, this);
	getRelay = getOverlayRelay.bind(this, this);
	put = putOverlayNode.bind(this, this);
	remove = removeOverlayNode.bind(this, this);
	sample = sampleOverlayNodes.bind(this, this);
	update = updateOverlayNode.bind(this, this);
}
