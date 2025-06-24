import { RemoteInfo } from "dgram";
import { AddressInfo } from "net";
import { createChecksum } from "../../utilities/Hash";
import { NetworkAddressCodec, NetworkAddressProperties } from "./Codec";
import { IP_FAMILY_MAP, IP_FAMILY_REVERSE_MAP, IpFamily } from "./Constant";
import { mockNetworkAddress } from "./methods/mock";

export namespace NetworkAddress {
	export interface Properties<T extends IpFamily = IpFamily> extends Omit<NetworkAddressProperties, "family"> {
		family: T;
	}
}

export class NetworkAddress<T extends IpFamily = IpFamily> implements NetworkAddress.Properties<T> {
	static mock = mockNetworkAddress;

	static fromRemoteInfo = (remoteInfo: AddressInfo) => {
		return new NetworkAddress({
			...remoteInfo,
			family: IP_FAMILY_REVERSE_MAP[remoteInfo.family as "IPv4" | "IPv6"],
		});
	};

	readonly family: T;
	readonly address: string;
	readonly port: number;

	constructor(properties: NetworkAddress.Properties<T>) {
		this.family = properties.family;
		this.address = properties.address;
		this.port = properties.port;
	}

	get buffer(): Uint8Array {
		return NetworkAddressCodec.encode(this);
	}

	get byteLength(): number {
		return NetworkAddressCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get properties(): NetworkAddress.Properties<T> {
		const { family, address, port } = this;

		return { family, address, port };
	}

	toRemoteInfo(size: number): RemoteInfo {
		return {
			size,
			...this.properties,
			family: IP_FAMILY_MAP[this.family],
		};
	}

	toString() {
		switch (this.family) {
			case IpFamily.IPv4:
				return `${this.address}:${this.port}`;
			case IpFamily.IPv6:
				return `[${this.address}]:${this.port}`;
		}
	}
}
