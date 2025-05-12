import { createChecksum } from "../../../utilities/Hash";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { IpType } from "../../Address/Constant";
import { Keys } from "../../Keys";
import { BaseNode } from "../Base";
import { NatType } from "../Constant";
import { Nat1Node } from "../Nat1";
import { Nat3NodeCodec, Nat3NodeProperties } from "./Codec";
import { createNat3Node } from "./methods/create";
import { hashNat3Node } from "./methods/hash";
import { mockNat3Node } from "./methods/mock";
import { updateNat3Node } from "./methods/update";

export namespace Nat3Node {
	export type Properties = Nat3NodeProperties;
}

export class Nat3Node extends BaseNode implements Nat3Node.Properties {
	static create = createNat3Node;
	static hash = hashNat3Node;
	static mock = mockNat3Node;

	readonly natType = NatType.NAT3;
	address: Address;
	relayNode: Nat1Node;

	constructor(properties: RequiredProperties<Nat3Node.Properties, "address" | "relayNode" | "rSignature">) {
		super(properties);

		this.address = properties.address;
		this.relayNode = properties.relayNode;
	}

	private _buffer?: Uint8Array;

	get buffer(): Uint8Array {
		return this._buffer || (this._buffer = Nat3NodeCodec.encode(this));
	}

	set buffer(value: Uint8Array | undefined) {
		this._buffer = value;
	}

	get byteLength(): number {
		return Nat3NodeCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get hash(): Uint8Array {
		return Nat3Node.hash(this);
	}

	get ipType(): IpType {
		return this.address.ip.type;
	}

	get properties(): Nat3Node.Properties {
		const { natType, address, relayNode } = this;

		return { ...super.properties, natType, address, relayNode };
	}

	private _publicKey: Uint8Array | undefined;

	get publicKey(): Uint8Array {
		return this._publicKey || (this._publicKey = Keys.recover(this.rSignature, this.hash));
	}

	set publicKey(value: Uint8Array | undefined) {
		this._publicKey = value;
	}

	update = updateNat3Node.bind(this, this);
}
