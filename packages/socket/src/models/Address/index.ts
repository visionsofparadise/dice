import { RemoteInfo } from "dgram";
import { createChecksum } from "../../utilities/Hash";
import { AddressCodec, AddressProperties, Ip } from "./Codec";
import { IP_FAMILY_IP_TYPE_MAPPING, IP_TYPE_IP_FAMILY_MAPPING, IpType } from "./Constant";
import { mockAddress } from "./methods/mock";

export namespace Address {
	export interface Properties extends AddressProperties {}
}

export class Address implements Address.Properties {
	static mock = mockAddress;

	static fromRemoteInfo = (remoteInfo: RemoteInfo) => {
		return new Address({
			ip: {
				type: IP_FAMILY_IP_TYPE_MAPPING[remoteInfo.family],
				value: remoteInfo.address,
			},
			port: remoteInfo.port,
		});
	};

	readonly ip: Ip;
	readonly port: number;

	constructor(properties: Address.Properties) {
		this.ip = properties.ip;
		this.port = properties.port;
	}

	get buffer(): Uint8Array {
		return AddressCodec.encode(this);
	}

	get byteLength(): number {
		return AddressCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get properties(): Address.Properties {
		const { ip, port } = this;

		return { ip, port };
	}

	toRemoteInfo(size: number): RemoteInfo {
		return {
			family: IP_TYPE_IP_FAMILY_MAPPING[this.ip.type],
			address: this.ip.value,
			port: this.port,
			size,
		};
	}

	toString() {
		switch (this.ip.type) {
			case IpType.IPV4:
				return `${this.ip.value}:${this.port}`;
			case IpType.IPV6:
				return `[${this.ip.value}]:${this.port}`;
		}
	}
}
