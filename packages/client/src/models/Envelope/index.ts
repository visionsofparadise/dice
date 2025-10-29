import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { RequiredProperties } from "../../utilities/RequiredProperties";
import { Address } from "../Address";
import { EnvelopeCodec, EnvelopeProperties, VERSION } from "./Codec";
import { mockEnvelope } from "./methods/mock";

export namespace Envelope {
	export type Properties = EnvelopeProperties;

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
	}
}

export class Envelope implements Envelope.Properties {
	static mock = mockEnvelope;

	readonly magicBytes = MAGIC_BYTES;
	readonly version = VERSION.V1;
	readonly flags: Record<string, never> = {};
	readonly reflectionAddress?: Address;
	readonly payload: Uint8Array;

	constructor(
		properties: RequiredProperties<Envelope.Properties, "payload">,
		public readonly cache: Envelope.Cache = {}
	) {
		this.reflectionAddress = properties.reflectionAddress;
		this.payload = properties.payload;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = EnvelopeCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = EnvelopeCodec.byteLength(this));
	}

	get properties(): Envelope.Properties {
		const { magicBytes, version, flags, reflectionAddress, payload } = this;

		return { magicBytes, version, flags, reflectionAddress, payload };
	}
}
