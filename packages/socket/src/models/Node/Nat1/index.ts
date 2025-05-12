import { createChecksum } from "../../../utilities/Hash";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { IpType } from "../../Address/Constant";
import { Keys } from "../../Keys";
import { BaseNode } from "../Base";
import { NatType } from "../Constant";
import { Nat1NodeCodec, Nat1NodeProperties } from "./Codec";
import { createNat1Node } from "./methods/create";
import { hashNat1Node } from "./methods/hash";
import { mockNat1Node } from "./methods/mock";
import { updateNat1Node } from "./methods/update";

export namespace Nat1Node {
	export type Properties = Nat1NodeProperties;
}

export class Nat1Node extends BaseNode implements Nat1Node.Properties {
	static create = createNat1Node;
	static hash = hashNat1Node;
	static mock = mockNat1Node;

	readonly natType = NatType.NAT1;
	address: Address;

	constructor(properties: RequiredProperties<Nat1Node.Properties, "address" | "rSignature">) {
		super(properties);

		this.address = properties.address;
	}

	private _buffer?: Uint8Array;

	get buffer(): Uint8Array {
		return this._buffer || (this._buffer = Nat1NodeCodec.encode(this));
	}

	set buffer(value: Uint8Array | undefined) {
		this._buffer = value;
	}

	get byteLength(): number {
		return Nat1NodeCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get hash(): Uint8Array {
		return Nat1Node.hash(this);
	}

	get ipType(): IpType {
		return this.address.ip.type;
	}

	get properties(): Nat1Node.Properties {
		const { natType, address } = this;

		return { ...super.properties, natType, address };
	}

	private _publicKey?: Uint8Array;

	get publicKey(): Uint8Array {
		return this._publicKey || (this._publicKey = Keys.recover(this.rSignature, this.hash));
	}

	set publicKey(value: Uint8Array | undefined) {
		this._publicKey = value;
	}

	update = updateNat1Node.bind(this, this);
}
