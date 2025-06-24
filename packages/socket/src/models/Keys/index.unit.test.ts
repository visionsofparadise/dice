import { Keys } from ".";
import { DiceAddressCodec, PrivateKeyCodec, PublicKeyCodec } from "./Codec";

it("constructs keys", () => {
	const keys = new Keys();

	expect(keys.privateKey.byteLength).toBe(PrivateKeyCodec.byteLength());
	expect(keys.publicKey.byteLength).toBe(PublicKeyCodec.byteLength());
	expect(keys.diceAddress.byteLength).toBe(DiceAddressCodec.byteLength());
});
