import { hex } from "@scure/base";
import { RemoteInfo } from "dgram";
import ipaddr from "ipaddr.js";
import { AddressInfo } from "net";
import { AddressType } from "../Address/Type";
import { DiceError } from "../Error";
import { Ipv4AddressCodec, Ipv4AddressProperties } from "./Codec";
import { mockAddress } from "./methods/mock";

export namespace Ipv4Address {
	export interface Properties extends Ipv4AddressProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		isPrivate?: boolean;
		key?: string;
		prefix?: string;
		string?: string;
	}
}

export class Ipv4Address implements Ipv4Address.Properties {
	static fromAddressInfo(addressInfo: AddressInfo) {
		if (addressInfo.family !== "IPv4") throw new DiceError("Invalid address");

		return new Ipv4Address({
			ip: Uint8Array.from(ipaddr.parse(addressInfo.address).toByteArray()),
			port: addressInfo.port,
		});
	}

	static fromString(string: string): Ipv4Address {
		if (!string || string === "") throw new DiceError("Invalid address string");

		const ipv4Parts = string.split(":");

		if (!ipv4Parts || !ipv4Parts[0] || !ipv4Parts[1]) throw new DiceError("Invalid address string");

		return new Ipv4Address({
			ip: Uint8Array.from(ipaddr.parse(ipv4Parts[0]).toByteArray()),
			port: parseInt(ipv4Parts[1]),
		});
	}

	static mock = mockAddress;

	readonly type = AddressType.IPv4;
	readonly ip: Uint8Array;
	readonly port: number;

	constructor(
		properties: Omit<Ipv4Address.Properties, "type">,
		public readonly cache: Ipv4Address.Cache = {}
	) {
		this.ip = properties.ip;
		this.port = properties.port;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = Ipv4AddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = Ipv4AddressCodec.byteLength(this));
	}

	get isPrivate(): boolean {
		if (this.cache.isPrivate !== undefined) return this.cache.isPrivate;

		const ip = ipaddr.fromByteArray([...this.ip]).toString();

		return (this.cache.isPrivate =
			ip.startsWith("10.") || ip.startsWith("169.254.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.buffer));
	}

	get prefix(): string {
		return this.cache.prefix || (this.cache.prefix = hex.encode(this.ip.subarray(0, 2)));
	}

	get properties(): Ipv4Address.Properties {
		const { type, ip, port } = this;

		return { type, ip, port };
	}

	toRemoteInfo(size: number): RemoteInfo {
		return {
			size,
			...this.properties,
			family: "IPv4",
			address: ipaddr.fromByteArray([...this.ip]).toString(),
		};
	}

	toString() {
		return this.cache.string || (this.cache.string = `${ipaddr.fromByteArray([...this.ip]).toString()}:${this.port}`);
	}
}
