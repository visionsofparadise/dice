import { hex } from "@scure/base";
import { createChecksum } from "../../../utilities/Hash";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { IpFamily } from "../../NetworkAddress/Constant";
import { Nat } from "../Constant";
import { Nat4EndpointCodec, Nat4EndpointProperties } from "./Codec";
import { mockNat4Endpoint } from "./methods/mock";

export namespace Nat4Endpoint {
	export interface Properties extends Nat4EndpointProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		key?: string;
	}
}

export class Nat4Endpoint implements Nat4Endpoint.Properties {
	static mock = mockNat4Endpoint;

	readonly nat = Nat.NAT4;
	readonly networkAddress: {
		family: IpFamily;
	};

	constructor(
		properties: RequiredProperties<Nat4Endpoint.Properties, "networkAddress">,
		public readonly cache: Nat4Endpoint.Cache = {}
	) {
		this.networkAddress = properties.networkAddress;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = Nat4EndpointCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = Nat4EndpointCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.checksum));
	}

	get properties(): Nat4Endpoint.Properties {
		const { nat, networkAddress } = this;

		return { nat, networkAddress };
	}
}
