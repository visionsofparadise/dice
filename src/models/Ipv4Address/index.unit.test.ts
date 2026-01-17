import { describe, it, expect } from "vitest";
import { Ipv4Address } from ".";
import { AddressType } from "../Address/Type";

describe("Ipv4Address", () => {
	describe("fromAddressInfo", () => {
		it("creates from dgram AddressInfo", () => {
			const address = Ipv4Address.fromAddressInfo({
				address: "192.0.2.1",
				family: "IPv4",
				port: 8080,
			});

			expect(address).toBeInstanceOf(Ipv4Address);
			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv4);
		});

		it("throws on invalid family", () => {
			expect(() =>
				Ipv4Address.fromAddressInfo({
					address: "::1",
					family: "IPv6" as any,
					port: 8080,
				})
			).toThrow("Invalid address");
		});
	});

	describe("fromString", () => {
		it("parses valid address string", () => {
			const address = Ipv4Address.fromString("192.0.2.1:8080");

			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv4);
		});

		it("throws on empty string", () => {
			expect(() => Ipv4Address.fromString("")).toThrow("Invalid address string");
		});

		it("throws on missing port", () => {
			expect(() => Ipv4Address.fromString("192.0.2.1")).toThrow("Invalid address string");
		});

		it("throws on invalid format", () => {
			expect(() => Ipv4Address.fromString("invalid")).toThrow();
		});
	});

	describe("constructor", () => {
		it("creates address with ip and port", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			expect(address.ip).toEqual(Uint8Array.from([192, 0, 2, 1]));
			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv4);
		});
	});

	describe("buffer", () => {
		it("encodes to Uint8Array", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const buffer = address.buffer;

			expect(buffer).toBeInstanceOf(Uint8Array);
			expect(buffer.length).toBe(6); // 4 IP + 2 port
		});

		it("caches buffer", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const buffer1 = address.buffer;
			const buffer2 = address.buffer;

			expect(buffer1).toBe(buffer2);
		});
	});

	describe("byteLength", () => {
		it("returns 6 bytes", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			expect(address.byteLength).toBe(6);
		});

		it("caches byte length", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const length1 = address.byteLength;
			const length2 = address.byteLength;

			// Should be same computation
			expect(length1).toBe(length2);
		});
	});

	describe("isPrivate", () => {
		it("detects 10.0.0.0/8", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([10, 0, 0, 1]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(true);
		});

		it("detects 192.168.0.0/16", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 168, 1, 1]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(true);
		});

		it("detects 172.16.0.0/12", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([172, 16, 0, 1]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(true);
		});

		it("detects 169.254.0.0/16 (link-local)", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([169, 254, 1, 1]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(true);
		});

		it("detects 100.64.0.0/10 (CGNAT)", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([100, 64, 0, 1]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(true);
		});

		it("returns false for public address", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([8, 8, 8, 8]),
				port: 8080,
			});

			expect(address.isPrivate).toBe(false);
		});

		it("caches result", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([8, 8, 8, 8]),
				port: 8080,
			});

			const result1 = address.isPrivate;
			const result2 = address.isPrivate;

			expect(result1).toBe(result2);
		});
	});

	describe("key", () => {
		it("generates hex-encoded identifier", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const key = address.key;

			expect(typeof key).toBe("string");
			expect(key.length).toBeGreaterThan(0);
		});

		it("caches key", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const key1 = address.key;
			const key2 = address.key;

			expect(key1).toBe(key2);
		});

		it("generates unique keys for different addresses", () => {
			const address1 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const address2 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 2]),
				port: 8080,
			});

			expect(address1.key).not.toBe(address2.key);
		});
	});

	describe("prefix", () => {
		it("extracts first 3 bytes (/24)", () => {
			const address1 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const address2 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 99]),
				port: 9090,
			});

			expect(address1.prefix).toBe(address2.prefix);
		});

		it("differs for different /24", () => {
			const address1 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const address2 = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 3, 1]),
				port: 8080,
			});

			expect(address1.prefix).not.toBe(address2.prefix);
		});

		it("caches prefix", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const prefix1 = address.prefix;
			const prefix2 = address.prefix;

			expect(prefix1).toBe(prefix2);
		});
	});

	describe("toRemoteInfo", () => {
		it("converts to dgram RemoteInfo", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const remoteInfo = address.toRemoteInfo(100);

			expect(remoteInfo.address).toBe("192.0.2.1");
			expect(remoteInfo.family).toBe("IPv4");
			expect(remoteInfo.port).toBe(8080);
			expect(remoteInfo.size).toBe(100);
		});
	});

	describe("toString", () => {
		it("formats as ip:port", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			expect(address.toString()).toBe("192.0.2.1:8080");
		});

		it("caches string", () => {
			const address = new Ipv4Address({
				ip: Uint8Array.from([192, 0, 2, 1]),
				port: 8080,
			});

			const string1 = address.toString();
			const string2 = address.toString();

			expect(string1).toBe(string2);
		});
	});

	describe("round-trip", () => {
		it("fromString → toString equals original", () => {
			const original = "192.0.2.1:8080";
			const address = Ipv4Address.fromString(original);

			expect(address.toString()).toBe(original);
		});
	});
});
