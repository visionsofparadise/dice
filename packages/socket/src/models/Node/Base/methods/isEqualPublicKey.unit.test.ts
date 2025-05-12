import { Address } from "../../../Address";
import { Keys } from "../../../Keys";
import { Nat1Node } from "../../Nat1";
import { Nat3Node } from "../../Nat3";

it("returns true for same publicKey nodes", () => {
	const keys = new Keys();

	const nodeA = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keys
	);

	const nodeB = Nat3Node.create(
		{
			address: Address.mock(),
			relayNode: Nat1Node.mock(),
			generation: 1,
		},
		keys
	);

	expect(nodeA.isEqualPublicKey(nodeA)).toBe(true);
	expect(nodeA.isEqualPublicKey(nodeB)).toBe(true);
});

it("returns false for different publicKey nodes", () => {
	const keysA = new Keys();

	const nodeA = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keysA
	);

	const keysB = new Keys();

	const nodeB = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keysB
	);

	expect(nodeA.isEqualPublicKey(nodeB)).toBe(false);
});
