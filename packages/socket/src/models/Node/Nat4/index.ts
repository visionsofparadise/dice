import { createChecksum } from "../../../utilities/Hash";
import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Address } from "../../Address";
import { IpType } from "../../Address/Constant";
import { Keys } from "../../Keys";
import { BaseNode } from "../Base";
import { NatType } from "../Constant";
import { Nat1Node } from "../Nat1";
import { Nat4NodeCodec, Nat4NodeProperties } from "./Codec";
import { createNat4Node } from "./methods/create";
import { hashNat4Node } from "./methods/hash";
import { mockNat4Node } from "./methods/mock";
import { updateNat4Node } from "./methods/update";

export namespace Nat4Node {
	export type Properties = Nat4NodeProperties;
}

export class Nat4Node extends BaseNode implements Nat4Node.Properties {
	static create = createNat4Node;
	static hash = hashNat4Node;
	static mock = mockNat4Node;

	readonly natType = NatType.NAT4;
	address: Address;
	relayNode: Nat1Node;

	constructor(properties: RequiredProperties<Nat4Node.Properties, "address" | "relayNode" | "rSignature">) {
		super(properties);

		this.address = properties.address;
		this.relayNode = properties.relayNode;
	}

	private _buffer?: Uint8Array;

	get buffer(): Uint8Array {
		return this._buffer || (this._buffer = Nat4NodeCodec.encode(this));
	}

	set buffer(value: Uint8Array | undefined) {
		this._buffer = value;
	}

	get byteLength(): number {
		return Nat4NodeCodec.byteLength(this);
	}

	get checksum(): Uint8Array {
		return createChecksum(this.buffer);
	}

	get hash(): Uint8Array {
		return Nat4Node.hash(this);
	}

	get ipType(): IpType {
		return this.address.ip.type;
	}

	get properties(): Nat4Node.Properties {
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

	update = updateNat4Node.bind(this, this);
}
