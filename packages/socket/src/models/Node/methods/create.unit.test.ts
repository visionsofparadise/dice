import { Node } from "..";
import { Keys } from "../../Keys";

it("creates a valid node", () => {
	const keys = new Keys();

	const node = Node.create({}, keys);

	expect(Keys.isVerified(node.rSignature.signature, node.hash, node.publicKey)).toBe(true);
});
