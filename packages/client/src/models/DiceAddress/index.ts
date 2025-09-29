import { AddressType } from "../Address/Type";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { DiceAddressCodec, DiceAddressProperties } from "./Codec";
import { mockEndpoint } from "./methods/mock";

export namespace DiceAddress {
	export interface Properties extends DiceAddressProperties {}

	export interface Cache {
		buffer?: Uint8Array;
		byteLength?: number;
	}
}

export class DiceAddress implements DiceAddress.Properties {
	static PROTOCOL = "dice://";

	static fromString(string: string) {
		const body = string.slice(this.PROTOCOL.length);
		const [ipv6String, ipv6RelayAddressStrings, ipv4String, ipv4RelayAddressStrings] = body.split("/");

		let ipv6: Ipv6Address | undefined = undefined;

		try {
			if (ipv6String) ipv6 = Ipv6Address.fromString(ipv6String);
		} catch (error) {}

		let ipv6RelayAddresses: Array<Ipv6Address> | undefined = undefined;

		try {
			if (ipv6RelayAddressStrings) ipv6RelayAddresses = ipv6RelayAddressStrings.split(",").map((string) => Ipv6Address.fromString(string));
		} catch (error) {}

		let ipv4: Ipv4Address | undefined = undefined;

		try {
			if (ipv4String) ipv4 = Ipv4Address.fromString(ipv4String);
		} catch (error) {}

		let ipv4RelayAddresses: Array<Ipv4Address> | undefined = undefined;

		try {
			if (ipv4RelayAddressStrings) ipv4RelayAddresses = ipv4RelayAddressStrings.split(",").map((string) => Ipv4Address.fromString(string));
		} catch (error) {}

		return new DiceAddress({
			[AddressType.IPv6]: ipv6
				? {
						address: ipv6,
						coordinators: ipv6RelayAddresses,
					}
				: undefined,
			[AddressType.IPv4]: ipv4
				? {
						address: ipv4,
						coordinators: ipv4RelayAddresses,
					}
				: undefined,
		});
	}

	static mock = mockEndpoint;

	[AddressType.IPv6]?: {
		address: Ipv6Address;
		coordinators?: Array<Ipv6Address>;
	};
	[AddressType.IPv4]?: {
		address: Ipv4Address;
		coordinators?: Array<Ipv4Address>;
	};

	constructor(
		properties?: Partial<DiceAddress.Properties>,
		public readonly cache: DiceAddress.Cache = {}
	) {
		this[AddressType.IPv6] = properties ? properties[AddressType.IPv6] : undefined;
		this[AddressType.IPv4] = properties ? properties[AddressType.IPv4] : undefined;
	}

	get buffer(): Uint8Array {
		return this.cache.buffer || (this.cache.buffer = DiceAddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength || (this.cache.byteLength = DiceAddressCodec.byteLength(this));
	}

	get properties(): DiceAddress.Properties {
		const { [AddressType.IPv6]: ipv6, [AddressType.IPv4]: ipv4 } = this;

		return { [AddressType.IPv6]: ipv6, [AddressType.IPv4]: ipv4 };
	}

	toString(): string {
		return `${DiceAddress.PROTOCOL}${this[AddressType.IPv6]?.address || ""}/${this[AddressType.IPv6]?.coordinators?.join(",") || ""}/${this[AddressType.IPv4]?.address || ""}/${this[AddressType.IPv4]?.coordinators?.join(",") || ""}`;
	}
}
