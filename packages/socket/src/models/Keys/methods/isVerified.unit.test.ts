import { Keys } from "..";

it("verifies with public key", () => {
	const keys = new Keys();

	const hash = crypto.getRandomValues(new Uint8Array(32));

	const signature = keys.sign(hash);

	const isVerified = Keys.isVerified(signature, hash, keys.publicKey);

	expect(isVerified).toBe(true);
});
