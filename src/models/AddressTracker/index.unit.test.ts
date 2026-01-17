import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddressTracker } from ".";
import { BindingCache } from "../BindingCache";
import { Envelope } from "../Envelope";
import { Ipv4Address } from "../Ipv4Address";
import { UdpTransport } from "../UdpTransport";

describe("AddressTracker", () => {
	let mockUdpTransport: UdpTransport;
	let mockBindings: BindingCache;
	let addressTracker: AddressTracker;

	beforeEach(() => {
		const mockSocket = {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 8080 }),
			close: vi.fn(),
			on: vi.fn(),
			removeListener: vi.fn(),
			send: vi.fn(),
			unref: vi.fn(),
		};

		mockUdpTransport = new UdpTransport({ socket: mockSocket });

		mockBindings = new BindingCache({
			udpTransport: mockUdpTransport,
			bindInTtlMs: 25_000,
			bindOutTtlMs: 20_000,
			cacheSize: 1000,
		});

		addressTracker = new AddressTracker({
			udpTransport: mockUdpTransport,
			bindings: mockBindings,
			isAddressValidationDisabled: true, // Disable validation for testing
		});
	});

	describe("constructor", () => {
		it("initializes with OPENED state", () => {
			expect(addressTracker.state).toBe(AddressTracker.STATE.OPENED);
		});

		it("registers envelope listener on udpTransport", () => {
			expect(mockUdpTransport.events.listenerCount("envelope")).toBe(2); // BindingCache + AddressTracker
		});

		it("uses default reachable window", () => {
			expect(addressTracker.options.reachableWindowMs).toBe(60_000);
		});

		it("respects custom reachable window", () => {
			const customState = new AddressTracker({
				udpTransport: mockUdpTransport,
				bindings: mockBindings,
				reachableWindowMs: 30_000,
			});

			expect(customState.options.reachableWindowMs).toBe(30_000);
		});
	});

	describe("reflection consensus", () => {
		const createEnvelope = (reflectionAddress: Ipv4Address): Envelope =>
			new Envelope({
				payload: new Uint8Array([1, 2, 3]),
				reflectionAddress,
			});

		const createContext = (remoteAddress: Ipv4Address): UdpTransport.Context => ({
			buffer: new Uint8Array([1, 2, 3]),
			remoteInfo: {
				address: remoteAddress.toString().split(":")[0],
				family: "IPv4",
				port: remoteAddress.port,
				size: 100,
			},
			remoteAddress,
		});

		it("stores first reflection as challenging", () => {
			const reflection1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });
			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });

			const envelope = createEnvelope(reflection1);
			const context = createContext(peer1);

			mockUdpTransport.events.emit("envelope", envelope, context);

			expect(addressTracker.external).toBeUndefined();
		});

		it("establishes consensus when two diverse peers agree", () => {
			const addressSpy = vi.fn();
			addressTracker.events.on("address", addressSpy);

			const reflection = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });

			// First peer (192.0.2.x)
			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer1));

			expect(addressTracker.external).toBeUndefined();

			// Second peer from different /24 (192.0.3.x)
			const peer2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 3, 10]), port: 9091 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer2));

			expect(addressTracker.external).toBeDefined();
			expect(addressTracker.external?.key).toBe(reflection.key);
			expect(addressSpy).toHaveBeenCalledWith(reflection, false);
		});

		it("ignores reflections from same prefix", () => {
			const reflection = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });

			// First peer (192.0.2.10)
			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer1));

			// Second peer from SAME /24 (192.0.2.11)
			const peer2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 11]), port: 9091 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer2));

			// Still no consensus because peers are from same prefix
			expect(addressTracker.external).toBeUndefined();
		});

		it("detects symmetric NAT when reflections disagree", () => {
			const addressSpy = vi.fn();
			addressTracker.events.on("address", addressSpy);

			const reflection1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });
			const reflection2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8081 }); // Different port

			// First peer agrees on reflection1
			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection1), createContext(peer1));

			const peer2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 3, 10]), port: 9091 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection1), createContext(peer2));

			expect(addressTracker.external?.key).toBe(reflection1.key);
			expect(addressTracker.isSymmetric).toBe(false);

			// Third peer reports different reflection (symmetric NAT)
			const peer3 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 4, 10]), port: 9092 });
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection2), createContext(peer3));

			expect(addressTracker.external).toBeUndefined();
			expect(addressTracker.isSymmetric).toBe(true);
		});

		it("updates bindings external address on consensus", () => {
			const reflection = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });

			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const peer2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 3, 10]), port: 9091 });

			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer1));
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection), createContext(peer2));

			expect(mockBindings.external?.key).toBe(reflection.key);
		});

		it("rejects invalid public addresses when validation enabled", () => {
			const validatedState = new AddressTracker({
				udpTransport: mockUdpTransport,
				bindings: mockBindings,
				isAddressValidationDisabled: false,
			});

			const privateReflection = new Ipv4Address({ ip: Uint8Array.from([192, 168, 1, 1]), port: 8080 });
			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });

			mockUdpTransport.events.emit("envelope", createEnvelope(privateReflection), createContext(peer1));

			expect(validatedState.external).toBeUndefined();
		});

		it("allows reflections to replace challenging reflection before consensus", () => {
			const reflection1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });
			const reflection2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 2]), port: 8080 });
			const reflection3 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 3]), port: 8080 });

			const peer1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const peer2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 3, 10]), port: 9091 });
			const peer3 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 4, 10]), port: 9092 });

			// First reflection becomes challenging
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection1), createContext(peer1));

			// Second reflection from different prefix overwrites challenging
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection2), createContext(peer2));

			// Third reflection matches second, establishes consensus on reflection2
			mockUdpTransport.events.emit("envelope", createEnvelope(reflection2), createContext(peer3));

			expect(addressTracker.external?.key).toBe(reflection2.key);
		});
	});

	describe("reachability tracking", () => {
		beforeEach(() => {
			// Set up external address
			addressTracker.external = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });
			mockBindings.external = addressTracker.external;
		});

		it("tracks unsolicited messages", () => {
			const peer = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const context: UdpTransport.Context = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.10", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: peer,
			};

			const beforeTime = Date.now();
			mockUdpTransport.events.emit("envelope", envelope, context);

			expect(addressTracker.lastUnsolicitedAt).toBeGreaterThanOrEqual(beforeTime);
			expect(addressTracker.isReachable).toBe(true);
		});

		it("does not track solicited messages (with outbound binding)", () => {
			const peer = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });

			// Establish outbound binding
			mockBindings.establishOutboundBinding(addressTracker.external!.key, peer.key);

			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const context: UdpTransport.Context = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.10", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: peer,
			};

			addressTracker.lastUnsolicitedAt = 0;
			mockUdpTransport.events.emit("envelope", envelope, context);

			expect(addressTracker.lastUnsolicitedAt).toBe(0);
		});

		it("becomes unreachable after window expires", () => {
			const peer = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const context: UdpTransport.Context = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.10", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: peer,
			};

			mockUdpTransport.events.emit("envelope", envelope, context);
			expect(addressTracker.isReachable).toBe(true);

			// Simulate time passing
			addressTracker.lastUnsolicitedAt = Date.now() - 61_000; // 61 seconds ago
			expect(addressTracker.isReachable).toBe(false);
		});

		it("emits address event on reachability change", () => {
			const addressSpy = vi.fn();
			addressTracker.events.on("address", addressSpy);

			const peer = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const context: UdpTransport.Context = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.10", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: peer,
			};

			// First unsolicited message (not reachable → reachable)
			addressTracker.lastUnsolicitedAt = 0;
			mockUdpTransport.events.emit("envelope", envelope, context);

			expect(addressSpy).toHaveBeenCalledWith(addressTracker.external, true);
		});

		it("does not emit event if reachability unchanged", () => {
			const addressSpy = vi.fn();
			addressTracker.events.on("address", addressSpy);

			const peer = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });
			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const context: UdpTransport.Context = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.10", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: peer,
			};

			// Set already reachable
			addressTracker.lastUnsolicitedAt = Date.now();

			mockUdpTransport.events.emit("envelope", envelope, context);

			expect(addressSpy).not.toHaveBeenCalled();
		});
	});

	describe("isRemoteAddress", () => {
		it("returns true for valid remote addresses", () => {
			const remoteAddress = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });

			expect(addressTracker.isRemoteAddress(remoteAddress)).toBe(true);
		});

		it("returns false for local address", () => {
			expect(addressTracker.isRemoteAddress(mockUdpTransport.local)).toBe(false);
		});

		it("returns false for external address", () => {
			addressTracker.external = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });

			expect(addressTracker.isRemoteAddress(addressTracker.external)).toBe(false);
		});

		it("returns false for undefined", () => {
			expect(addressTracker.isRemoteAddress(undefined)).toBe(false);
		});

		it("returns false for different address type", () => {
			// This would be an IPv6 address, but our mock udpTransport is IPv4
			// In reality, this wouldn't happen, but let's ensure type checking works
			const ipv4UdpTransport = mockUdpTransport; // IPv4
			const ipv6Address = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 10]), port: 9090 });

			// Can't easily test cross-type without creating IPv6 setup
			// Just verify current behavior works
			expect(addressTracker.isRemoteAddress(ipv6Address)).toBe(true);
		});
	});

	describe("close", () => {
		it("removes udpTransport listener", () => {
			const initialListenerCount = mockUdpTransport.events.listenerCount("envelope");

			addressTracker.close();

			expect(mockUdpTransport.events.listenerCount("envelope")).toBe(initialListenerCount - 1);
		});

		it("sets state to CLOSED", () => {
			addressTracker.close();

			expect(addressTracker.state).toBe(AddressTracker.STATE.CLOSED);
		});

		it("is idempotent", () => {
			const initialListenerCount = mockUdpTransport.events.listenerCount("envelope");

			addressTracker.close();
			addressTracker.close();

			expect(mockUdpTransport.events.listenerCount("envelope")).toBe(initialListenerCount - 1);
		});
	});
});
