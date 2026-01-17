import { hex } from "@scure/base";
import type { RemoteInfo } from "dgram";
import ipaddr from "ipaddr.js";
import type { AddressInfo } from "net";
import { AddressType } from "../Address/Type";
import { DiceError } from "../Error";
import { Ipv6AddressCodec, type Ipv6AddressProperties } from "./Codec";

export namespace Ipv6Address {
	export interface Properties extends Ipv6AddressProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		isPrivate?: boolean;
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

		// Use regex to properly parse bracketed IPv6 format: [2001:db8::1]:8080
		const IPV6_ADDRESS_REGEX = /^\[(?<ipv6>[^\]]+)\]:(?<port>\d+)$/;
		const match = IPV6_ADDRESS_REGEX.exec(string);

		const ipv6 = match?.groups?.ipv6;
		const port = match?.groups?.port;

		if (!ipv6 || !port) throw new DiceError("Invalid address string");

		return new Ipv6Address({
			ip: Uint8Array.from(ipaddr.parse(ipv6).toByteArray()),
			port: parseInt(port),
		});
	}

	static mock(properties?: Partial<Ipv6Address.Properties>) {
		return new Ipv6Address({
			ip: Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
			port: 6173,
			...properties,
		});
	}

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
		return this.cache.buffer ?? (this.cache.buffer = Ipv6AddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength ?? (this.cache.byteLength = Ipv6AddressCodec.byteLength(this));
	}

	get isPrivate(): boolean {
		if (this.cache.isPrivate !== undefined) return this.cache.isPrivate;

		return (this.cache.isPrivate = (this.ip[0] === 0xfc && this.ip[1] === 0x00) || (this.ip[0] === 0xfd && this.ip[1] === 0x00) || (this.ip[0] === 0xfe && this.ip[1] === 0x80));
	}

	get key(): string {
		return this.cache.key ?? (this.cache.key = hex.encode(this.buffer));
	}

	get prefix(): string {
		return this.cache.prefix ?? (this.cache.prefix = hex.encode(this.ip.subarray(0, 8)));
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
		return this.cache.string ?? (this.cache.string = `[${ipaddr.fromByteArray([...this.ip]).toString()}]:${this.port}`);
	}
}
