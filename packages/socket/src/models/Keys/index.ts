import { secp256k1 } from "@noble/curves/secp256k1";
import { createShortHash } from "../../utilities/Hash";
import { KeysCodec, KeysProperties } from "./Codec";
import { isKeysRVerified } from "./methods/isRVerified";
import { isKeysVerified } from "./methods/isVerified";
import { normalizeKeysAddress } from "./methods/normalizeAddressKey";
import { recoverKeys } from "./methods/recover";
import { rSignKeys } from "./methods/rSign";
import { signKeys } from "./methods/sign";

export namespace Keys {
	export type Properties = KeysProperties;
}

export class Keys implements Keys.Properties {
	static isRVerified = isKeysRVerified;
	static isVerified = isKeysVerified;
	static normalizeAddress = normalizeKeysAddress;
	static recover = recoverKeys;

	privateKey: Uint8Array;
	publicKey: Uint8Array;
	diceAddress: Uint8Array;

	constructor(properties?: Partial<Keys.Properties>) {
		this.privateKey = properties?.privateKey || secp256k1.utils.randomPrivateKey();
		this.publicKey = secp256k1.getPublicKey(this.privateKey, true);
		this.diceAddress = createShortHash(this.publicKey);
	}

	get buffer(): Uint8Array {
		return KeysCodec.encode(this);
	}

	get byteLength(): number {
		return KeysCodec.byteLength(this);
	}

	get properties(): Keys.Properties {
		const { privateKey } = this;

		return { privateKey };
	}

	rSign = rSignKeys.bind(this, this);
	sign = signKeys.bind(this, this);
}
