import { MAGIC_BYTES } from "../../utilities/magicBytes";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import { type MessageBodyMap, MessageBodyType } from "./BodyCodec";
import { MessageCodec, type MessageProperties, MessageVersion } from "./Codec";

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
	}
}

export class Message<T extends MessageBodyType = MessageBodyType> implements Message.Properties<T> {
	static mock(properties?: Partial<Message.Properties>) {
		return new Message({
			body: {
				type: MessageBodyType.NOOP,
			},
			...properties,
		});
	}

	readonly magicBytes = MAGIC_BYTES;
	readonly version = MessageVersion.V0;
	readonly flags: {
		isNotCandidate: boolean;
	};
	readonly body: MessageBodyMap[T];

	constructor(properties: RequiredProperties<Message.Properties<T>, "body">, public readonly cache: Message.Cache = {}) {
		this.flags = properties.flags ?? { isNotCandidate: false };
		this.body = properties.body;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer ?? (this.cache.buffer = MessageCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength ?? (this.cache.byteLength = MessageCodec.byteLength(this));
	}

	get properties(): Message.Properties<T> {
		const { magicBytes, version, flags, body } = this;

		return { magicBytes, version, flags, body };
	}
}
