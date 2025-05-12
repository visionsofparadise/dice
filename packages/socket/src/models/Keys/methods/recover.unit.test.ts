import { compare } from "uint8array-tools";
import { Keys } from "..";

it("recovers correct publicKey", () => {
	const keys = new Keys();

	const hash = crypto.getRandomValues(new Uint8Array(32));

	const rSignature = keys.rSign(hash);

	const publicKey = Keys.recover(rSignature, hash);

	expect(compare(keys.publicKey, publicKey) === 0).toBe(true);
});
