import { compare } from "uint8array-tools";
import { Node } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Keys } from "../../Keys";
import { NetworkAddress } from "../../NetworkAddress";
import { IpFamily } from "../../NetworkAddress/Constant";

it("validly updates node", () => {
	const keys = new Keys();

	const node = Node.create({}, keys);

	const updatedNode = node.update(
		{
			endpoints: [
				new Nat1Endpoint({
					networkAddress: new NetworkAddress({
						family: IpFamily.IPv4,
						address: "0.0.0.0",
						port: 61735,
					}),
				}),
			],
		},
		keys
	);

	expect(compare(node.rSignature.signature, updatedNode.rSignature.signature) === 0).toBe(false);
	expect(Keys.isVerified(updatedNode.rSignature.signature, updatedNode.hash, updatedNode.publicKey)).toBe(true);
	expect(updatedNode.sequenceNumber).toBe(1);
});

it("skips update on no change", () => {
	const keys = new Keys();

	const node = Node.create({}, keys);

	const updatedNode = node.update({}, keys);

	expect(compare(node.rSignature.signature, updatedNode.rSignature.signature) === 0).toBe(true);
	expect(Keys.isVerified(updatedNode.rSignature.signature, updatedNode.hash, updatedNode.publicKey)).toBe(true);
	expect(updatedNode.sequenceNumber).toBe(0);
});
