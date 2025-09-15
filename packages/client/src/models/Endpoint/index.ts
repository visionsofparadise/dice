import { hex } from "@scure/base";
import { Address } from "../Address";
import { EndpointCodec, EndpointProperties } from "./Codec";
import { mockEndpoint } from "./methods/mock";

export namespace Endpoint {
	export interface Properties extends EndpointProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		key?: string;
	}
}

export class Endpoint implements Endpoint.Properties {
	static mock = mockEndpoint;

	readonly address?: Address;
	relayAddresses: Array<Address>;

	constructor(
		properties?: Partial<Endpoint.Properties>,
		public readonly cache: Endpoint.Cache = {}
	) {
		this.address = properties?.address;
		this.relayAddresses = properties?.relayAddresses || [];
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = EndpointCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = EndpointCodec.byteLength(this));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.buffer));
	}

	get properties(): Endpoint.Properties {
		const { address, relayAddresses } = this;

		return { address, relayAddresses };
	}
}
