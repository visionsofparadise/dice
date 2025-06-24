import { compare } from "uint8array-tools";
import { Keys } from "..";
import { createShortHash } from "../../../utilities/Hash";
import { RSignature } from "../Codec";

export const isKeysRVerified = (rSignature: RSignature, message: Uint8Array, diceAddress: Uint8Array): boolean => {
	const publicKey = Keys.recover(rSignature, message);

	const recoveredDiceAddress = createShortHash(publicKey);

	return compare(recoveredDiceAddress, diceAddress) === 0;
};
