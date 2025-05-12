import { secp256k1 } from "@noble/curves/secp256k1";
import { compare } from "uint8array-tools";
import { Keys } from "..";

it("rSigns with keys", () => {
	const keys = new Keys();

	const hash = crypto.getRandomValues(new Uint8Array(32));

	const rSignature = keys.rSign(hash);

	const publicKey = Keys.recover(rSignature, hash);

	expect(compare(keys.publicKey, publicKey) === 0).toBe(true);
	expect(secp256k1.verify(rSignature.signature, hash, keys.publicKey, { format: "compact", prehash: false })).toBe(true);
});
