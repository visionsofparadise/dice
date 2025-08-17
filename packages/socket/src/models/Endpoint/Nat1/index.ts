import { hex } from "@scure/base";
import { createChecksum } from "../../../utilities/Checksum";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { Nat } from "../Constant";
import { Nat1EndpointCodec, Nat1EndpointProperties } from "./Codec";
import { mockNat1Endpoint } from "./methods/mock";

export namespace Nat1Endpoint {
	export interface Properties extends Nat1EndpointProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		key?: string;
	}
}

export class Nat1Endpoint implements Nat1Endpoint.Properties {
	static mock = mockNat1Endpoint;

	readonly nat = Nat.NAT1;
	readonly address: Address;

	constructor(
		properties: RequiredProperties<Nat1Endpoint.Properties, "address">,
		public readonly cache: Nat1Endpoint.Cache = {}
	) {
		this.address = properties.address;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = Nat1EndpointCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = Nat1EndpointCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.checksum));
	}

	get properties(): Nat1Endpoint.Properties {
		const { nat, address } = this;

		return { nat, address };
	}
}
