import { Nat1Node } from "..";
import { Address } from "../../../Address";
import { Keys } from "../../../Keys";

it("creates a valid node", () => {
	const keys = new Keys();

	const node = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keys
	);

	expect(Keys.isVerified(node.rSignature.signature, node.hash, node.publicKey)).toBe(true);
});
