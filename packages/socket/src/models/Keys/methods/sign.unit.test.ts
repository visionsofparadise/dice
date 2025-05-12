import { secp256k1 } from "@noble/curves/secp256k1";
import { Keys } from "..";

it("signs with private key", () => {
	const keys = new Keys();

	const hash = crypto.getRandomValues(new Uint8Array(32));

	const signature = keys.sign(hash);

	expect(secp256k1.verify(signature, hash, keys.publicKey, { format: "compact", prehash: false })).toBe(true);
});
