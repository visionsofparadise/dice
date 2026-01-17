import { describe, it, expect } from "vitest";
import { Ipv6Address } from ".";
import { AddressType } from "../Address/Type";

describe("Ipv6Address", () => {
	describe("fromAddressInfo", () => {
		it("creates from dgram AddressInfo", () => {
			const address = Ipv6Address.fromAddressInfo({
				address: "2001:db8::1",
				family: "IPv6",
				port: 8080,
			});

			expect(address).toBeInstanceOf(Ipv6Address);
			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv6);
		});

		it("throws on invalid family", () => {
			expect(() =>
				Ipv6Address.fromAddressInfo({
					address: "192.0.2.1",
					family: "IPv4" as any,
					port: 8080,
				})
			).toThrow("Invalid address");
		});
	});

	describe("fromString", () => {
		it("parses valid address string with brackets", () => {
			const address = Ipv6Address.fromString("[2001:db8::1]:8080");

			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv6);
		});

		it("parses loopback address", () => {
			const address = Ipv6Address.fromString("[::1]:9090");

			expect(address.port).toBe(9090);
		});

		it("throws on empty string", () => {
			expect(() => Ipv6Address.fromString("")).toThrow("Invalid address string");
		});

		it("throws on missing port", () => {
			expect(() => Ipv6Address.fromString("[2001:db8::1]")).toThrow("Invalid address string");
		});

		it("throws on invalid format", () => {
			expect(() => Ipv6Address.fromString("invalid")).toThrow();
		});
	});

	describe("constructor", () => {
		it("creates address with ip and port", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0x20;
			ip[1] = 0x01;
			ip[2] = 0x0d;
			ip[3] = 0xb8;
			ip[15] = 0x01;

			const address = new Ipv6Address({
				ip,
				port: 8080,
			});

			expect(address.ip).toEqual(ip);
			expect(address.port).toBe(8080);
			expect(address.type).toBe(AddressType.IPv6);
		});
	});

	describe("buffer", () => {
		it("encodes to Uint8Array", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const buffer = address.buffer;

			expect(buffer).toBeInstanceOf(Uint8Array);
			expect(buffer.length).toBe(18); // 16 IP + 2 port
		});

		it("caches buffer", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const buffer1 = address.buffer;
			const buffer2 = address.buffer;

			expect(buffer1).toBe(buffer2);
		});
	});

	describe("byteLength", () => {
		it("returns 18 bytes", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.byteLength).toBe(18);
		});

		it("caches byte length", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const length1 = address.byteLength;
			const length2 = address.byteLength;

			expect(length1).toBe(length2);
		});
	});

	describe("isPrivate", () => {
		it("detects fc00::/7 (ULA)", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0xfc;
			ip[1] = 0x00;

			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.isPrivate).toBe(true);
		});

		it("detects fd00::/7 (ULA)", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0xfd;
			ip[1] = 0x00;

			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.isPrivate).toBe(true);
		});

		it("detects fe80::/10 (link-local)", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0xfe;
			ip[1] = 0x80;

			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.isPrivate).toBe(true);
		});

		it("returns false for public address", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0x20;
			ip[1] = 0x01;
			ip[2] = 0x48;
			ip[3] = 0x60;

			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.isPrivate).toBe(false);
		});

		it("caches result", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0x20;
			ip[1] = 0x01;

			const address = new Ipv6Address({ ip, port: 8080 });

			const result1 = address.isPrivate;
			const result2 = address.isPrivate;

			expect(result1).toBe(result2);
		});
	});

	describe("key", () => {
		it("generates hex-encoded identifier", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const key = address.key;

			expect(typeof key).toBe("string");
			expect(key.length).toBeGreaterThan(0);
		});

		it("caches key", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const key1 = address.key;
			const key2 = address.key;

			expect(key1).toBe(key2);
		});

		it("generates unique keys for different addresses", () => {
			const ip1 = new Uint8Array(16);
			ip1[15] = 1;
			const ip2 = new Uint8Array(16);
			ip2[15] = 2;

			const address1 = new Ipv6Address({ ip: ip1, port: 8080 });
			const address2 = new Ipv6Address({ ip: ip2, port: 8080 });

			expect(address1.key).not.toBe(address2.key);
		});
	});

	describe("prefix", () => {
		it("extracts first 8 bytes (/64)", () => {
			const ip1 = new Uint8Array(16);
			ip1[0] = 0x20;
			ip1[1] = 0x01;
			ip1[15] = 1;

			const ip2 = new Uint8Array(16);
			ip2[0] = 0x20;
			ip2[1] = 0x01;
			ip2[15] = 99;

			const address1 = new Ipv6Address({ ip: ip1, port: 8080 });
			const address2 = new Ipv6Address({ ip: ip2, port: 9090 });

			expect(address1.prefix).toBe(address2.prefix);
		});

		it("differs for different /64", () => {
			const ip1 = new Uint8Array(16);
			ip1[0] = 0x20;
			ip1[1] = 0x01;
			ip1[7] = 0x00;

			const ip2 = new Uint8Array(16);
			ip2[0] = 0x20;
			ip2[1] = 0x01;
			ip2[7] = 0x01;

			const address1 = new Ipv6Address({ ip: ip1, port: 8080 });
			const address2 = new Ipv6Address({ ip: ip2, port: 8080 });

			expect(address1.prefix).not.toBe(address2.prefix);
		});

		it("caches prefix", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const prefix1 = address.prefix;
			const prefix2 = address.prefix;

			expect(prefix1).toBe(prefix2);
		});
	});

	describe("toRemoteInfo", () => {
		it("converts to dgram RemoteInfo", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0x20;
			ip[1] = 0x01;
			ip[2] = 0x0d;
			ip[3] = 0xb8;
			ip[15] = 0x01;

			const address = new Ipv6Address({ ip, port: 8080 });

			const remoteInfo = address.toRemoteInfo(100);

			expect(remoteInfo.address).toBe("2001:db8::1");
			expect(remoteInfo.family).toBe("IPv6");
			expect(remoteInfo.port).toBe(8080);
			expect(remoteInfo.size).toBe(100);
		});
	});

	describe("toString", () => {
		it("formats as [ip]:port", () => {
			const ip = new Uint8Array(16);
			ip[0] = 0x20;
			ip[1] = 0x01;
			ip[2] = 0x0d;
			ip[3] = 0xb8;
			ip[15] = 0x01;

			const address = new Ipv6Address({ ip, port: 8080 });

			expect(address.toString()).toBe("[2001:db8::1]:8080");
		});

		it("caches string", () => {
			const ip = new Uint8Array(16);
			const address = new Ipv6Address({ ip, port: 8080 });

			const string1 = address.toString();
			const string2 = address.toString();

			expect(string1).toBe(string2);
		});
	});

	describe("round-trip", () => {
		it("fromString → toString equals original", () => {
			const original = "[2001:db8::1]:8080";
			const address = Ipv6Address.fromString(original);

			expect(address.toString()).toBe(original);
		});

		it("handles :: compression", () => {
			const original = "[::1]:9090";
			const address = Ipv6Address.fromString(original);

			expect(address.toString()).toBe(original);
		});
	});
});
