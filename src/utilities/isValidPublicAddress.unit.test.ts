import { describe, it, expect } from "vitest";
import { isValidPublicAddress } from "./isValidPublicAddress";
import { Ipv4Address } from "../models/Ipv4Address";
import { Ipv6Address } from "../models/Ipv6Address";

describe("isValidPublicAddress", () => {
	describe("IPv4 validation", () => {
		it("rejects 10.0.0.0/8 (private)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([10, 1, 2, 3]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 192.168.0.0/16 (private)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 172.16.0.0/12 (private)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([172, 16, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 172.31.0.0/12 (private, end of range)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([172, 31, 255, 255]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 127.0.0.0/8 (loopback)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([127, 0, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 169.254.0.0/16 (link-local)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([169, 254, 1, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 100.64.0.0/10 (CGNAT)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([100, 64, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 224.0.0.0/4 (multicast)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([224, 0, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 255.255.255.255 (broadcast)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([255, 255, 255, 255]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 192.0.2.0/24 (documentation)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([192, 0, 2, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 198.51.100.0/24 (documentation)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([198, 51, 100, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 203.0.113.0/24 (documentation)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 198.18.0.0/15 (benchmark)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([198, 18, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects 240.0.0.0/4 (reserved)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([240, 0, 0, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("accepts valid public unicast (8.8.8.8)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([8, 8, 8, 8]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(true);
		});

		it("accepts valid public unicast (1.1.1.1)", () => {
			const address = new Ipv4Address({ ip: new Uint8Array([1, 1, 1, 1]), port: 8080 });
			expect(isValidPublicAddress(address)).toBe(true);
		});
	});

	describe("IPv6 validation", () => {
		it("rejects fc00::/7 (ULA)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0xfc, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects fe80::/10 (link-local)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0xfe, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects ::1 (loopback)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("rejects ff00::/8 (multicast)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(false);
		});

		it("accepts valid public unicast (2001:4860:4860::8888)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0x20, 0x01, 0x48, 0x60, 0x48, 0x60, 0, 0, 0, 0, 0, 0, 0, 0, 0x88, 0x88]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(true);
		});

		it("accepts valid public unicast (2606:4700:4700::1111)", () => {
			const address = new Ipv6Address({
				ip: new Uint8Array([0x26, 0x06, 0x47, 0x00, 0x47, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0x11, 0x11]),
				port: 8080,
			});
			expect(isValidPublicAddress(address)).toBe(true);
		});
	});
});
