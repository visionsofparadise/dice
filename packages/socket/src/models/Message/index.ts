import { createChecksum } from "../../utilities/Hash";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Node } from "../Node/Codec";
import { MessageBodyMap, MessageBodyType } from "./BodyCodec";
import { MessageCodec, MessageProperties } from "./Codec";
import { mockMessage } from "./methods/mock";

export namespace Message {
	export type Properties<T extends MessageBodyType = MessageBodyType> = Omit<MessageProperties, "body"> & {
		body: MessageBodyMap[T] & {
			type: T;
		};
	};
}

export class Message<T extends MessageBodyType = MessageBodyType> implements Message.Properties<T> {
	static mock = mockMessage;

	readonly sourceNode: Node;
	readonly targetNode: Node;
	readonly body: MessageBodyMap[T];

	constructor(properties: RequiredProperties<Message.Properties<T>, "sourceNode" | "targetNode" | "body">) {
		this.sourceNode = properties.sourceNode;
		this.targetNode = properties.targetNode;
		this.body = properties.body;
	}

	private _buffer?: Uint8Array;

	get buffer(): Uint8Array {
		return this._buffer || (this._buffer = MessageCodec.encode(this));
	}

	set buffer(value: Uint8Array | undefined) {
		this._buffer = value;
	}

	get byteLength(): number {
		return MessageCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get properties(): Message.Properties<T> {
		const { sourceNode, targetNode, body } = this;

		return { sourceNode, targetNode, body };
	}
}
