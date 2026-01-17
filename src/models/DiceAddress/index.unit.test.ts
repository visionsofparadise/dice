import { describe, it, expect } from "vitest";
import { DiceAddress } from ".";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import { AddressType } from "../Address/Type";

describe("DiceAddress", () => {
	describe("fromString", () => {
		it("parses full dual-stack with coordinators", () => {
			const address = DiceAddress.fromString(
				"dice://[2001:db8::1]:8080/[2001:db8::2]:8080,[2001:db8::3]:8080/192.0.2.1:8080/192.0.2.2:8080,192.0.2.3:8080"
			);

			expect(address[AddressType.IPv6]?.address).toBeInstanceOf(Ipv6Address);
			expect(address[AddressType.IPv6]?.coordinators).toHaveLength(2);
			expect(address[AddressType.IPv4]?.address).toBeInstanceOf(Ipv4Address);
			expect(address[AddressType.IPv4]?.coordinators).toHaveLength(2);
		});

		it("parses IPv6 only", () => {
			const address = DiceAddress.fromString("dice://[2001:db8::1]:8080///");

			expect(address[AddressType.IPv6]?.address).toBeInstanceOf(Ipv6Address);
			expect(address[AddressType.IPv4]).toBeUndefined();
		});

		it("parses IPv4 only", () => {
			const address = DiceAddress.fromString("dice:////192.0.2.1:8080/");

			expect(address[AddressType.IPv4]?.address).toBeInstanceOf(Ipv4Address);
			expect(address[AddressType.IPv6]).toBeUndefined();
		});

		it("parses with coordinators only", () => {
			const address = DiceAddress.fromString("dice://[2001:db8::1]:8080/[2001:db8::2]:8080//");

			expect(address[AddressType.IPv6]?.address).toBeInstanceOf(Ipv6Address);
			expect(address[AddressType.IPv6]?.coordinators).toHaveLength(1);
		});

		it("parses without coordinators", () => {
			const address = DiceAddress.fromString("dice://[2001:db8::1]:8080//192.0.2.1:8080/");

			expect(address[AddressType.IPv6]?.address).toBeInstanceOf(Ipv6Address);
			expect(address[AddressType.IPv6]?.coordinators).toBeUndefined();
			expect(address[AddressType.IPv4]?.address).toBeInstanceOf(Ipv4Address);
			expect(address[AddressType.IPv4]?.coordinators).toBeUndefined();
		});

		it("throws on invalid protocol", () => {
			expect(() => DiceAddress.fromString("http://[2001:db8::1]:8080///")).toThrow('must start with "dice://"');
		});

		it("throws on empty string", () => {
			expect(() => DiceAddress.fromString("")).toThrow('must start with "dice://"');
		});

		it("throws on invalid format (wrong number of parts)", () => {
			expect(() => DiceAddress.fromString("dice://invalid")).toThrow("expected 4 parts");
		});

		it("throws on invalid IPv6 address", () => {
			expect(() => DiceAddress.fromString("dice://invalid:8080///")).toThrow("Invalid IPv6 address");
		});

		it("throws on invalid IPv4 address", () => {
			expect(() => DiceAddress.fromString("dice:////invalid:8080/")).toThrow("Invalid IPv4 address");
		});

		it("throws on invalid IPv6 coordinator", () => {
			expect(() => DiceAddress.fromString("dice://[2001:db8::1]:8080/invalid//")).toThrow("Invalid IPv6 coordinator");
		});

		it("throws on invalid IPv4 coordinator", () => {
			expect(() => DiceAddress.fromString("dice:////192.0.2.1:8080/invalid")).toThrow("Invalid IPv4 coordinator");
		});

		it("throws when no endpoints provided", () => {
			expect(() => DiceAddress.fromString("dice://///")).toThrow("must have at least one IPv4 or IPv6 endpoint");
		});
	});

	describe("constructor", () => {
		it("creates dual-stack DiceAddress", () => {
			const ipv6 = Ipv6Address.fromString("[2001:db8::1]:8080");
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");

			const address = new DiceAddress({
				[AddressType.IPv6]: { address: ipv6 },
				[AddressType.IPv4]: { address: ipv4 },
			});

			expect(address[AddressType.IPv6]?.address).toBe(ipv6);
			expect(address[AddressType.IPv4]?.address).toBe(ipv4);
		});

		it("creates single-stack DiceAddress", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");

			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			expect(address[AddressType.IPv4]?.address).toBe(ipv4);
			expect(address[AddressType.IPv6]).toBeUndefined();
		});

		it("creates empty DiceAddress", () => {
			const address = new DiceAddress();

			expect(address[AddressType.IPv6]).toBeUndefined();
			expect(address[AddressType.IPv4]).toBeUndefined();
		});
	});

	describe("buffer", () => {
		it("encodes to Uint8Array", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			const buffer = address.buffer;

			expect(buffer).toBeInstanceOf(Uint8Array);
			expect(buffer.length).toBeGreaterThan(0);
		});

		it("caches buffer", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			const buffer1 = address.buffer;
			const buffer2 = address.buffer;

			expect(buffer1).toBe(buffer2);
		});
	});

	describe("byteLength", () => {
		it("returns correct size", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			expect(address.byteLength).toBeGreaterThan(0);
		});

		it("caches byte length", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			const length1 = address.byteLength;
			const length2 = address.byteLength;

			expect(length1).toBe(length2);
		});
	});

	describe("toString", () => {
		it("formats dual-stack with coordinators", () => {
			const ipv6 = Ipv6Address.fromString("[2001:db8::1]:8080");
			const ipv6Coord = Ipv6Address.fromString("[2001:db8::2]:8080");
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const ipv4Coord = Ipv4Address.fromString("192.0.2.2:8080");

			const address = new DiceAddress({
				[AddressType.IPv6]: { address: ipv6, coordinators: [ipv6Coord] },
				[AddressType.IPv4]: { address: ipv4, coordinators: [ipv4Coord] },
			});

			const string = address.toString();

			expect(string).toContain("dice://");
			expect(string).toContain("[2001:db8::1]:8080");
			expect(string).toContain("[2001:db8::2]:8080");
			expect(string).toContain("192.0.2.1:8080");
			expect(string).toContain("192.0.2.2:8080");
		});

		it("formats IPv6 only", () => {
			const ipv6 = Ipv6Address.fromString("[2001:db8::1]:8080");

			const address = new DiceAddress({
				[AddressType.IPv6]: { address: ipv6 },
			});

			const string = address.toString();

			expect(string).toBe("dice://[2001:db8::1]:8080///");
		});

		it("formats IPv4 only", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");

			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4 },
			});

			const string = address.toString();

			expect(string).toBe("dice:////192.0.2.1:8080/");
		});

		it("formats without coordinators", () => {
			const ipv6 = Ipv6Address.fromString("[2001:db8::1]:8080");
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");

			const address = new DiceAddress({
				[AddressType.IPv6]: { address: ipv6 },
				[AddressType.IPv4]: { address: ipv4 },
			});

			const string = address.toString();

			expect(string).toBe("dice://[2001:db8::1]:8080//192.0.2.1:8080/");
		});

		it("handles multiple coordinators", () => {
			const ipv4 = Ipv4Address.fromString("192.0.2.1:8080");
			const coord1 = Ipv4Address.fromString("192.0.2.2:8080");
			const coord2 = Ipv4Address.fromString("192.0.2.3:8080");

			const address = new DiceAddress({
				[AddressType.IPv4]: { address: ipv4, coordinators: [coord1, coord2] },
			});

			const string = address.toString();

			expect(string).toContain("192.0.2.2:8080,192.0.2.3:8080");
		});
	});

	describe("round-trip", () => {
		it("fromString → toString equals original (dual-stack)", () => {
			const original = "dice://[2001:db8::1]:8080//192.0.2.1:8080/";
			const address = DiceAddress.fromString(original);

			expect(address.toString()).toBe(original);
		});

		it("fromString → toString equals original (IPv6 only)", () => {
			const original = "dice://[2001:db8::1]:8080///";
			const address = DiceAddress.fromString(original);

			expect(address.toString()).toBe(original);
		});

		it("fromString → toString equals original (IPv4 only)", () => {
			const original = "dice:////192.0.2.1:8080/";
			const address = DiceAddress.fromString(original);

			expect(address.toString()).toBe(original);
		});

		it("fromString → toString equals original (with coordinators)", () => {
			const original = "dice://[2001:db8::1]:8080/[2001:db8::2]:8080/192.0.2.1:8080/192.0.2.2:8080";
			const address = DiceAddress.fromString(original);

			expect(address.toString()).toBe(original);
		});
	});
});
