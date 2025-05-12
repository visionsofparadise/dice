import { Nat3Node } from "..";
import { Address } from "../../../Address";
import { Keys } from "../../../Keys";
import { Nat1Node } from "../../Nat1";

it("creates a valid node", () => {
	const keys = new Keys();

	const node = Nat3Node.create(
		{
			address: Address.mock(),
			relayNode: Nat1Node.mock(),
		},
		keys
	);

	expect(Keys.isVerified(node.rSignature.signature, node.hash, node.publicKey)).toBe(true);
});
