import { hex } from "@scure/base";
import { RemoteInfo } from "dgram";
import ipaddr from "ipaddr.js";
import { AddressInfo } from "net";
import { AddressType } from "../Address/Type";
import { DiceError } from "../Error";
import { Ipv6AddressCodec, Ipv6AddressProperties } from "./Codec";
import { mockAddress } from "./methods/mock";

export namespace Ipv6Address {
	export interface Properties extends Ipv6AddressProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		key?: string;
		prefix?: string;
		string?: string;
	}
}

export class Ipv6Address implements Ipv6Address.Properties {
	static fromAddressInfo(addressInfo: AddressInfo): Ipv6Address {
		if (addressInfo.family !== "IPv6") throw new DiceError("Invalid address");

		return new Ipv6Address({
			ip: Uint8Array.from(ipaddr.parse(addressInfo.address).toByteArray()),
			port: addressInfo.port,
		});
	}

	static fromString(string: string): Ipv6Address {
		if (!string || string === "") throw new DiceError("Invalid address string");

		const ipv6Parts = string.split(":");

		if (!ipv6Parts || !ipv6Parts[0] || !ipv6Parts[1]) throw new DiceError("Invalid address string");

		return new Ipv6Address({
			ip: Uint8Array.from(ipaddr.parse(ipv6Parts[0]).toByteArray()),
			port: parseInt(ipv6Parts[1]),
		});
	}

	static mock = mockAddress;

	readonly type = AddressType.IPv6;
	readonly ip: Uint8Array;
	readonly port: number;

	constructor(
		properties: Omit<Ipv6Address.Properties, "type">,
		public readonly cache: Ipv6Address.Cache = {}
	) {
		this.ip = properties.ip;
		this.port = properties.port;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = Ipv6AddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = Ipv6AddressCodec.byteLength(this));
	}

	get isPrivate(): boolean {
		return (this.ip[0] === 0xfc && this.ip[1] === 0x00) || (this.ip[0] === 0xfd && this.ip[1] === 0x00) || (this.ip[0] === 0xfe && this.ip[1] === 0x80);
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.buffer));
	}

	get prefix(): string {
		return this.cache.prefix || (this.cache.prefix = hex.encode(this.ip.subarray(0, 8)));
	}

	get properties(): Ipv6Address.Properties {
		const { type, ip, port } = this;

		return { type, ip, port };
	}

	toRemoteInfo(size: number): RemoteInfo {
		return {
			size,
			...this.properties,
			family: "IPv6",
			address: ipaddr.fromByteArray([...this.ip]).toString(),
		};
	}

	toString() {
		return this.cache.string || (this.cache.string = `[${ipaddr.fromByteArray([...this.ip]).toString()}]:${this.port}`);
	}
}
