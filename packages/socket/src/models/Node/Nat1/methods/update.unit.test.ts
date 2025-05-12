import { compare } from "uint8array-tools";
import { Nat1Node } from "..";
import { Address } from "../../../Address";
import { IpType } from "../../../Address/Constant";
import { Keys } from "../../../Keys";

it("validly updates node", () => {
	const keys = new Keys();

	const node = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keys
	);

	const updatedNode = node.update(
		{
			address: new Address({
				ip: {
					type: IpType.IPV4,
					value: "0.0.0.0",
				},
				port: 61735,
			}),
		},
		keys
	);

	expect(compare(node.rSignature.signature, updatedNode.rSignature.signature) === 0).toBe(false);
	expect(Keys.isVerified(updatedNode.rSignature.signature, updatedNode.hash, updatedNode.publicKey)).toBe(true);
	expect(updatedNode.sequenceNumber).toBe(1);
});

it("skips update on no change", () => {
	const keys = new Keys();

	const node = Nat1Node.create(
		{
			address: Address.mock(),
		},
		keys
	);

	const updatedNode = node.update(
		{
			address: node.address,
		},
		keys
	);

	expect(compare(node.rSignature.signature, updatedNode.rSignature.signature) === 0).toBe(true);
	expect(Keys.isVerified(updatedNode.rSignature.signature, updatedNode.hash, updatedNode.publicKey)).toBe(true);
	expect(updatedNode.sequenceNumber).toBe(0);
});
