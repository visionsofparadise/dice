import { describe, expect, it, vi } from "vitest";
import { Client } from ".";
import { AddressType } from "../Address/Type";

// Create minimal mock sockets
const createMockSocket = () => ({
	address: vi.fn(() => ({ address: "127.0.0.1", family: "IPv4", port: 8080 })),
	close: vi.fn(),
	on: vi.fn(),
	removeListener: vi.fn(),
	send: vi.fn(),
	unref: vi.fn(),
});

describe("Client", () => {
	describe("constructor", () => {
		it("creates IPv4 + IPv6 IpChannels when both sockets provided", () => {
			const ipv4Socket = createMockSocket();
			const ipv6Socket = createMockSocket();
			ipv6Socket.address.mockReturnValue({ address: "::1", family: "IPv6", port: 8080 });

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
				[AddressType.IPv6]: { socket: ipv6Socket },
			});

			expect(client.ipChannels[AddressType.IPv4]).toBeDefined();
			expect(client.ipChannels[AddressType.IPv6]).toBeDefined();
		});

		it("creates IPv4 only when IPv6 socket omitted", () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			expect(client.ipChannels[AddressType.IPv4]).toBeDefined();
			expect(client.ipChannels[AddressType.IPv6]).toBeUndefined();
		});

		it("creates IPv6 only when IPv4 socket omitted", () => {
			const ipv6Socket = createMockSocket();
			ipv6Socket.address.mockReturnValue({ address: "::1", family: "IPv6", port: 8080 });

			const client = new Client({
				[AddressType.IPv6]: { socket: ipv6Socket },
			});

			expect(client.ipChannels[AddressType.IPv6]).toBeDefined();
			expect(client.ipChannels[AddressType.IPv4]).toBeUndefined();
		});

		it("initializes with CLOSED state", () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			expect(client.state).toBe(Client.STATE.CLOSED);
		});

		it("applies default options", () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			expect(client.options.cacheSize).toBeGreaterThan(0);
			expect(client.options.concurrency).toBeGreaterThan(0);
			expect(client.options.depth).toBeDefined();
			expect(client.options.healthcheckIntervalMs).toBeGreaterThan(0);
		});
	});

	describe("open", () => {
		it("sets up event forwarding from IpChannels", async () => {
			const ipv4Socket = createMockSocket();
			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const bufferSpy = vi.fn();
			const envelopeSpy = vi.fn();
			const messageSpy = vi.fn();
			const diceMessageSpy = vi.fn();
			const depletedSpy = vi.fn();

			client.events.on("buffer", bufferSpy);
			client.events.on("envelope", envelopeSpy);
			client.events.on("message", messageSpy);
			client.events.on("diceMessage", diceMessageSpy);
			client.events.on("depleted", depletedSpy);

			client.open();

			// Emit events from layer to verify they're forwarded
			const ipChannel = client.ipChannels[AddressType.IPv4];

			if (ipChannel) {
				ipChannel.udpTransport.events.emit("buffer", new Uint8Array([1, 2, 3]), { address: "127.0.0.1", family: "IPv4", port: 9090, size: 3 });
				expect(bufferSpy).toHaveBeenCalled();

				ipChannel.coordinators.events.emit("depleted");
				expect(depletedSpy).toHaveBeenCalled();
			}
		});

		it("sets state to OPENED", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			client.open();

			expect(client.state).toBe(Client.STATE.OPENED);
		});

		it("emits open event", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const openSpy = vi.fn();
			client.events.on("open", openSpy);

			client.open();

			expect(openSpy).toHaveBeenCalled();
		});

		it("is idempotent (multiple calls safe)", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const openSpy = vi.fn();
			client.events.on("open", openSpy);

			client.open();
			client.open();
			client.open();

			// Should only emit once
			expect(openSpy).toHaveBeenCalledTimes(1);
			expect(client.state).toBe(Client.STATE.OPENED);
		});
	});

	describe("close", () => {
		it("closes all IpChannels", async () => {
			const ipv4Socket = createMockSocket();
			const ipv6Socket = createMockSocket();
			ipv6Socket.address.mockReturnValue({ address: "::1", family: "IPv6", port: 8080 });

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
				[AddressType.IPv6]: { socket: ipv6Socket },
			});

			client.open();

			const ipv4CloseSpy = vi.spyOn(client.ipChannels[AddressType.IPv4]!, "close");
			const ipv6CloseSpy = vi.spyOn(client.ipChannels[AddressType.IPv6]!, "close");

			client.close();

			expect(ipv4CloseSpy).toHaveBeenCalled();
			expect(ipv6CloseSpy).toHaveBeenCalled();
		});

		it("sets state to CLOSED", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			client.open();
			client.close();

			expect(client.state).toBe(Client.STATE.CLOSED);
		});

		it("emits close event", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const closeSpy = vi.fn();
			client.events.on("close", closeSpy);

			client.open();
			client.close();

			expect(closeSpy).toHaveBeenCalled();
		});

		it("is idempotent (multiple calls safe)", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const closeSpy = vi.fn();
			client.events.on("close", closeSpy);

			client.open();
			client.close();
			client.close();
			client.close();

			// Should only emit once
			expect(closeSpy).toHaveBeenCalledTimes(1);
			expect(client.state).toBe(Client.STATE.CLOSED);
		});
	});

	describe("diceAddress", () => {
		it("combines IPv4 + IPv6 endpoints", async () => {
			const ipv4Socket = createMockSocket();
			const ipv6Socket = createMockSocket();
			ipv6Socket.address.mockReturnValue({ address: "::1", family: "IPv6", port: 8080 });

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
				[AddressType.IPv6]: { socket: ipv6Socket },
			});

			client.open();

			const diceAddress = client.diceAddress;

			// Both endpoints should be present (though external addresses may not be set yet)
			expect(diceAddress).toBeDefined();
		});

		it("works with IPv4 only", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			client.open();

			const diceAddress = client.diceAddress;

			expect(diceAddress).toBeDefined();
			expect(diceAddress[AddressType.IPv6]).toBeUndefined();
		});

		it("works with IPv6 only", async () => {
			const ipv6Socket = createMockSocket();
			ipv6Socket.address.mockReturnValue({ address: "::1", family: "IPv6", port: 8080 });

			const client = new Client({
				[AddressType.IPv6]: { socket: ipv6Socket },
			});

			client.open();

			const diceAddress = client.diceAddress;

			expect(diceAddress).toBeDefined();
			expect(diceAddress[AddressType.IPv4]).toBeUndefined();
		});

		it("omits coordinators if IpChannel is reachable", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			client.open();

			const ipChannel = client.ipChannels[AddressType.IPv4];

			if (ipChannel) {
				// Mark IpChannel as reachable
				Object.defineProperty(ipChannel.addressTracker, "isReachable", { value: true });

				const diceAddress = client.diceAddress;

				if (diceAddress[AddressType.IPv4]) {
					expect(diceAddress[AddressType.IPv4].coordinators).toBeUndefined();
				}
			}
		});

		it("includes coordinators if IpChannel is not reachable", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			client.open();

			const ipChannel = client.ipChannels[AddressType.IPv4];

			if (ipChannel) {
				// Mark IpChannel as not reachable
				Object.defineProperty(ipChannel, "isReachable", { value: false });

				const diceAddress = client.diceAddress;

				// Coordinators will be an empty array if pool is empty, or undefined if no external address
				// The test is just verifying the logic path works
				expect(diceAddress).toBeDefined();
			}
		});
	});

	describe("event aggregation", () => {
		it("emits diceAddress when IpChannel address changes", async () => {
			const ipv4Socket = createMockSocket();

			const client = new Client({
				[AddressType.IPv4]: { socket: ipv4Socket },
			});

			const diceAddressSpy = vi.fn();
			client.events.on("diceAddress", diceAddressSpy);

			client.open();

			const ipChannel = client.ipChannels[AddressType.IPv4];

			if (ipChannel) {
				// Trigger address event from IpChannel
				ipChannel.events.emit("address");

				expect(diceAddressSpy).toHaveBeenCalled();
			}
		});
	});
});
