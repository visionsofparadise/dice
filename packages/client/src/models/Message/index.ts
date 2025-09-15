import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { MessageBodyMap, MessageBodyType } from "./BodyCodec";
import { MessageCodec, MessageProperties, VERSION } from "./Codec";
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
	}
}

export class Message<T extends MessageBodyType = MessageBodyType> implements Message.Properties<T> {
	static mock = mockMessage;

	readonly magicBytes = MAGIC_BYTES;
	readonly version = VERSION.V0;
	readonly body: MessageBodyMap[T];

	constructor(
		properties: RequiredProperties<Message.Properties<T>, "body">,
		public readonly cache: Message.Cache = {}
	) {
		this.body = properties.body;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = MessageCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = MessageCodec.byteLength(this));
	}

	get properties(): Message.Properties<T> {
		const { magicBytes, version, body } = this;

		return { magicBytes, version, body };
	}
}
