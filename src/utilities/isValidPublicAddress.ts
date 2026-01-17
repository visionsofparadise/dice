import ipaddr from "ipaddr.js";
import type { Address } from "../models/Address";
import { AddressType } from "../models/Address/Type";

/**
 * Validates that an address is a public, routable address.
 *
 * Rejects:
 * - Private addresses (RFC1918, ULA, etc.)
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Multicast addresses (224.0.0.0/4, ff00::/8)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Broadcast addresses (255.255.255.255)
 * - Documentation addresses (192.0.2.0/24, 2001:db8::/32)
 * - Reserved ranges
 *
 * @param address - Address to validate
 * @returns true if address is a valid public address
 */
export const isValidPublicAddress = (address: Address): boolean => {
	// Reject private addresses using existing logic
	if (address.isPrivate) return false;

	try {
		const ip = ipaddr.fromByteArray([...address.ip]);
		const range = ip.range();

		if (address.type === AddressType.IPv4) {
			// Accept only unicast addresses
			// This automatically rejects: loopback, multicast, broadcast, link-local, reserved
			if (range !== "unicast") return false;

			// Additional checks for specific reserved ranges
			const ipString = ip.toString();

			// Reject documentation ranges (TEST-NET-1, TEST-NET-2, TEST-NET-3)
			if (ipString.startsWith("192.0.2.") || ipString.startsWith("198.51.100.") || ipString.startsWith("203.0.113.")) {
				return false;
			}

			// Reject benchmark testing (198.18.0.0/15)
			if (ipString.startsWith("198.18.") || ipString.startsWith("198.19.")) {
				return false;
			}

			// Reject IANA reserved (240.0.0.0/4)
			const firstOctet = address.ip[0];
			if (firstOctet !== undefined && firstOctet >= 240) {
				return false;
			}

			return true;
		} else {
			// IPv6
			// Accept only unicast addresses
			// This automatically rejects: loopback, multicast, link-local, unspecified
			if (range !== "unicast") return false;

			// Reject documentation prefix (2001:db8::/32)
			if (address.ip[0] === 0x20 && address.ip[1] === 0x01 && address.ip[2] === 0x0d && address.ip[3] === 0xb8) {
				return false;
			}

			// Reject 6to4 (2002::/16) - deprecated
			if (address.ip[0] === 0x20 && address.ip[1] === 0x02) {
				return false;
			}

			// Reject Teredo (2001:0::/32) - tunneling protocol
			if (address.ip[0] === 0x20 && address.ip[1] === 0x01 && address.ip[2] === 0x00 && address.ip[3] === 0x00) {
				return false;
			}

			return true;
		}
	} catch {
		// If parsing fails, reject the address
		return false;
	}
};
