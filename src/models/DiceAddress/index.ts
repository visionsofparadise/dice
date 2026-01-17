import { AddressType } from "../Address/Type";
import { DiceError } from "../Error";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { DiceAddressCodec, type DiceAddressProperties } from "./Codec";

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
		// Validate protocol prefix
		if (!string.startsWith(this.PROTOCOL)) {
			throw new DiceError(`Invalid DICE address: must start with "${this.PROTOCOL}"`);
		}

		// Split address components
		const body = string.slice(this.PROTOCOL.length);
		const parts = body.split("/");

		if (parts.length !== 4) {
			throw new DiceError(`Invalid DICE address format: expected 4 parts separated by "/", got ${parts.length}`);
		}

		const [ipv6String, ipv6RelayAddressStrings, ipv4String, ipv4RelayAddressStrings] = parts;

		// Parse IPv6 endpoint (optional but validated if present)
		let ipv6: Ipv6Address | undefined = undefined;
		let ipv6RelayAddresses: Array<Ipv6Address> | undefined = undefined;

		if (ipv6String) {
			try {
				ipv6 = Ipv6Address.fromString(ipv6String);
			} catch (error) {
				throw new DiceError(`Invalid IPv6 address "${ipv6String}": ${error instanceof Error ? error.message : String(error)}`);
			}

			if (ipv6RelayAddressStrings) {
				try {
					ipv6RelayAddresses = ipv6RelayAddressStrings.split(",").map((addrString) => Ipv6Address.fromString(addrString));
				} catch (error) {
					throw new DiceError(`Invalid IPv6 coordinator address in "${ipv6RelayAddressStrings}": ${error instanceof Error ? error.message : String(error)}`);
				}
			}
		}

		// Parse IPv4 endpoint (optional but validated if present)
		let ipv4: Ipv4Address | undefined = undefined;
		let ipv4RelayAddresses: Array<Ipv4Address> | undefined = undefined;

		if (ipv4String) {
			try {
				ipv4 = Ipv4Address.fromString(ipv4String);
			} catch (error) {
				throw new DiceError(`Invalid IPv4 address "${ipv4String}": ${error instanceof Error ? error.message : String(error)}`);
			}

			if (ipv4RelayAddressStrings) {
				try {
					ipv4RelayAddresses = ipv4RelayAddressStrings.split(",").map((addrString) => Ipv4Address.fromString(addrString));
				} catch (error) {
					throw new DiceError(`Invalid IPv4 coordinator address in "${ipv4RelayAddressStrings}": ${error instanceof Error ? error.message : String(error)}`);
				}
			}
		}

		// Require at least one valid endpoint
		if (!ipv6 && !ipv4) {
			throw new DiceError("Invalid DICE address: must have at least one IPv4 or IPv6 endpoint");
		}

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

	static mock(properties?: Partial<DiceAddress.Properties>) {
		return new DiceAddress({
			[AddressType.IPv6]: {
				address: Ipv6Address.mock(),
			},
			...properties,
		});
	}

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
		return this.cache.buffer ?? (this.cache.buffer = DiceAddressCodec.encode(this));
	}

	get byteLength(): number {
		return this.cache.byteLength ?? (this.cache.byteLength = DiceAddressCodec.byteLength(this));
	}

	get properties(): DiceAddress.Properties {
		const { [AddressType.IPv6]: ipv6, [AddressType.IPv4]: ipv4 } = this;

		return { [AddressType.IPv6]: ipv6, [AddressType.IPv4]: ipv4 };
	}

	toString(): string {
		const ipv6Address = this[AddressType.IPv6]?.address.toString() ?? "";
		const ipv6Coordinators = this[AddressType.IPv6]?.coordinators?.map((coordinator) => coordinator.toString()).join(",") ?? "";
		const ipv4Address = this[AddressType.IPv4]?.address.toString() ?? "";
		const ipv4Coordinators = this[AddressType.IPv4]?.coordinators?.map((coordinator) => coordinator.toString()).join(",") ?? "";
		return `${DiceAddress.PROTOCOL}${ipv6Address}/${ipv6Coordinators}/${ipv4Address}/${ipv4Coordinators}`;
	}
}
