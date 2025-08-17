import { hex } from "@scure/base";
import { RemoteInfo } from "dgram";
import ipaddr from "ipaddr.js";
import { AddressInfo } from "net";
import { createChecksum } from "../../utilities/Checksum";
import { AddressCodec, AddressProperties } from "./Codec";
import { Family, FAMILY_MAP, FAMILY_REVERSE_MAP } from "./Constant";
import { mockAddress } from "./methods/mock";

export namespace Address {
	export interface Properties<T extends Family = Family> extends Omit<AddressProperties, "ip"> {
		ip: {
			family: T;
			address: Uint8Array;
		};
	}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
		checksum?: Uint8Array;
		key?: string;
		string?: string;
	}
}

export class Address<T extends Family = Family> implements Address.Properties<T> {
	static mock = mockAddress;

	static fromRemoteInfo = (remoteInfo: AddressInfo) => {
		return new Address({
			ip: {
				family: FAMILY_REVERSE_MAP[remoteInfo.family as "IPv4" | "IPv6"],
				address: Uint8Array.from(ipaddr.parse(remoteInfo.address).toByteArray()),
			},
			port: remoteInfo.port,
		});
	};

	readonly ip: {
		family: T;
		address: Uint8Array;
	};
	readonly port: number;

	constructor(
		properties: Address.Properties<T>,
		public readonly cache: Address.Cache = {}
	) {
		this.ip = properties.ip;
		this.port = properties.port;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = AddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = AddressCodec.byteLength(this));
	}

	get checksum(): Uint8Array {
		return this.cache.checksum || (this.cache.checksum = createChecksum(this.buffer));
	}

	get key(): string {
		return this.cache.key || (this.cache.key = hex.encode(this.checksum));
	}

	get properties(): Address.Properties<T> {
		const { ip, port } = this;

		return { ip, port };
	}

	toRemoteInfo(size: number): RemoteInfo {
		return {
			size,
			...this.properties,
			family: FAMILY_MAP[this.ip.family],
			address: ipaddr.fromByteArray([...this.ip.address]).toString(),
		};
	}

	toString() {
		if (this.cache.string) return this.cache.string;

		switch (this.ip.family) {
			case Family.IPv4: {
				this.cache.string = `${ipaddr.fromByteArray([...this.ip.address]).toString()}:${this.port}`;

				break;
			}
			case Family.IPv6: {
				this.cache.string = `[${ipaddr.fromByteArray([...this.ip.address]).toString()}]:${this.port}`;

				break;
			}
		}

		return this.cache.string;
	}
}
