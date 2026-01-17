import { describe, it, expect } from "vitest";
import { Address } from ".";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv6Address } from "../Ipv6Address";
import type { AddressInfo } from "net";

describe("Address", () => {
	describe("fromAddressInfo", () => {
		it("creates Ipv4Address for IPv4 family", () => {
			const addressInfo: AddressInfo = {
				address: "192.0.2.1",
				family: "IPv4",
				port: 8080,
			};

			const address = Address.fromAddressInfo(addressInfo);

			expect(address).toBeInstanceOf(Ipv4Address);
			expect(address.port).toBe(8080);
		});

		it("creates Ipv6Address for IPv6 family", () => {
			const addressInfo: AddressInfo = {
				address: "2001:db8::1",
				family: "IPv6",
				port: 9090,
			};

			const address = Address.fromAddressInfo(addressInfo);

			expect(address).toBeInstanceOf(Ipv6Address);
			expect(address.port).toBe(9090);
		});

		it("throws DiceError for invalid family", () => {
			const addressInfo = {
				address: "192.0.2.1",
				family: "InvalidFamily" as any,
				port: 8080,
			};

			expect(() => Address.fromAddressInfo(addressInfo)).toThrow("Invalid address info");
		});
	});
});
