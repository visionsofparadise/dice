import { hex } from "@scure/base";
import { createChecksum } from "../../../utilities/Checksum";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { Nat } from "../Constant";
import { Nat3EndpointCodec, Nat3EndpointProperties } from "./Codec";
import { mockNat3Endpoint } from "./methods/mock";

export namespace Nat3Endpoint {
	export interface Properties extends Nat3EndpointProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		key?: string;
	}
}

export class Nat3Endpoint implements Nat3Endpoint.Properties {
	static mock = mockNat3Endpoint;

	readonly nat = Nat.NAT3;
	readonly address: Address;
	relayAddresses: Array<Address>;

	constructor(
		properties: RequiredProperties<Nat3Endpoint.Properties, "address">,
		public readonly cache: Nat3Endpoint.Cache = {}
	) {
		this.address = properties.address;
		this.relayAddresses = properties.relayAddresses || [];
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = Nat3EndpointCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = Nat3EndpointCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.checksum));
	}

	get properties(): Nat3Endpoint.Properties {
		const { nat, address, relayAddresses } = this;

		return { nat, address, relayAddresses };
	}
}
