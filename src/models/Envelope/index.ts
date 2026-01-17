import { MAGIC_BYTES } from "../../utilities/magicBytes";
import type { RequiredProperties } from "../../utilities/RequiredProperties";
import type { Address } from "../Address";
import { EnvelopeCodec, type EnvelopeProperties, EnvelopeVersion } from "./Codec";

export namespace Envelope {
	export type Properties = EnvelopeProperties;

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
	}
}

export class Envelope implements Envelope.Properties {
	static mock(properties?: Partial<Envelope.Properties>) {
		return new Envelope({
			payload: new Uint8Array([0x00]),
			...properties,
		});
	}

	readonly magicBytes = MAGIC_BYTES;
	readonly version = EnvelopeVersion.V1;
	readonly flags: Record<string, never> = {};
	readonly reflectionAddress?: Address;
	readonly payload: Uint8Array;

	constructor(properties: RequiredProperties<Envelope.Properties, "payload">, public readonly cache: Envelope.Cache = {}) {
		this.reflectionAddress = properties.reflectionAddress;
		this.payload = properties.payload;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer ?? (this.cache.buffer = EnvelopeCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength ?? (this.cache.byteLength = EnvelopeCodec.byteLength(this));
	}

	get properties(): Envelope.Properties {
		const { magicBytes, version, flags, reflectionAddress, payload } = this;

		return { magicBytes, version, flags, reflectionAddress, payload };
	}
}
