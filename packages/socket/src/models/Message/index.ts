import { createChecksum } from "../../utilities/Hash";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Node } from "../Node";
import { MessageBodyMap, MessageBodyType } from "./BodyCodec";
import { MessageCodec, MessageProperties } from "./Codec";
import { createMessage } from "./methods/create";
import { hashMessage } from "./methods/hash";
import { mockMessage } from "./methods/mock";

export namespace Message {
	export type Properties<T extends MessageBodyType = MessageBodyType> = Omit<MessageProperties, "body"> & {
		body: MessageBodyMap[T] & {
			type: T;
		};
	};

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		hash?: Uint8Array;
	}
}

export class Message<T extends MessageBodyType = MessageBodyType> implements Message.Properties<T> {
	static create = createMessage;
	static hash = hashMessage;
	static mock = mockMessage;

	readonly magicBytes = MAGIC_BYTES;
	readonly node: Node;
	readonly body: MessageBodyMap[T];
	readonly signature: Uint8Array;

	constructor(
		properties: RequiredProperties<Message.Properties<T>, "node" | "body" | "signature">,
		public readonly cache: Message.Cache = {}
	) {
		this.node = properties.node;
		this.body = properties.body;
		this.signature = properties.signature;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = MessageCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = MessageCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get hash(): Uint8Array {
		return this.cache.hash || (this.cache.hash = Message.hash(this));
	}

	get nodes(): Array<Node> {
		let nodes: Array<Node> = [this.node];

		if ("nodes" in this.body) nodes = nodes.concat(this.body.nodes);

		return nodes;
	}

	get properties(): Message.Properties<T> {
		const { magicBytes, node, body, signature } = this;

		return { magicBytes, node, body, signature };
	}
}
