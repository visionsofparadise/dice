import { createChecksum, createShortHash } from "../../utilities/Hash";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Endpoint } from "../Endpoint/Codec";
import { Keys } from "../Keys";
import { RSignature } from "../Keys/Codec";
import { NodeCodec, NodeProperties } from "./Codec";
import { createNode } from "./methods/create";
import { hashNode } from "./methods/hash";
import { mockNode } from "./methods/mock";
import { scoreNode } from "./methods/score";
import { updateNode } from "./methods/update";

export namespace Node {
	export interface Properties extends NodeProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		diceAddress?: Uint8Array;
		endpointMap?: Map<string, Endpoint>;
		hash?: Uint8Array;
		publicKey?: Uint8Array;
	}
}

export class Node implements Node.Properties {
	static create = createNode;
	static hash = hashNode;
	static mock = mockNode;

	readonly endpoints: Array<Endpoint>;
	sequenceNumber: number;
	readonly generation: number;
	readonly rSignature: RSignature;

	isHealthchecking = false;

	constructor(
		properties: RequiredProperties<Node.Properties, "rSignature">,
		public readonly cache: Node.Cache = {}
	) {
		this.endpoints = properties.endpoints || [];
		this.sequenceNumber = properties.sequenceNumber || 0;
		this.generation = properties.generation || 0;
		this.rSignature = properties.rSignature;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = NodeCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = NodeCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get diceAddress(): Uint8Array {
		return this.cache.diceAddress || (this.cache.diceAddress = createShortHash(this.publicKey));
	}

	get endpointMap(): Map<string, Endpoint> {
		return this.cache.endpointMap || (this.cache.endpointMap = new Map(this.endpoints.map((endpoint) => [endpoint.key, endpoint])));
	}

	get hash(): Uint8Array {
		return this.cache.hash || (this.cache.hash = Node.hash(this));
	}

	get properties(): Node.Properties {
		const { endpoints, sequenceNumber, generation, rSignature } = this;

		return { endpoints, sequenceNumber, generation, rSignature };
	}

	get publicKey(): Uint8Array {
		return this.cache.publicKey || (this.cache.publicKey = Keys.recover(this.rSignature, this.hash));
	}

	get score(): number {
		return scoreNode(this);
	}

	update = updateNode.bind(this, this);
}
