import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BindingCache } from ".";
import { Adapter } from "../Adapter";
import { Ipv4Address } from "../Ipv4Address";
import { Envelope } from "../Envelope";

describe("BindingCache", () => {
	let mockSocket: any;
	let adapter: Adapter;
	let bindings: BindingCache;

	beforeEach(() => {
		mockSocket = {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 8080 }),
			close: vi.fn(),
			on: vi.fn(),
			removeListener: vi.fn(),
			send: vi.fn((_buffer, _offset, _length, _port, _address, callback) => callback?.(null)),
			unref: vi.fn(),
		};

		adapter = new Adapter({ socket: mockSocket });
		bindings = new BindingCache({ adapter });
	});

	afterEach(() => {
		adapter.close();
	});

	describe("inbound binding operations", () => {
		it("establishes inbound binding with 25s TTL", () => {
			const peerKey = "peer123";
			const selfKey = "self456";

			bindings.establishInboundBinding(peerKey, selfKey);

			expect(bindings.hasInboundBinding(peerKey, selfKey)).toBe(true);
		});

		it("inbound binding expires after TTL", () => {
			const peerKey = "peer123";
			const selfKey = "self456";
			const now = Date.now();

			bindings.establishInboundBinding(peerKey, selfKey, now);

			// Check immediately - should exist
			expect(bindings.hasInboundBinding(peerKey, selfKey, now)).toBe(true);

			// Check after 26s - should be expired (TTL is 25s)
			expect(bindings.hasInboundBinding(peerKey, selfKey, now + 26_000)).toBe(false);
		});
	});

	describe("outbound binding operations", () => {
		it("establishes outbound binding with 20s TTL", () => {
			const selfKey = "self456";
			const peerKey = "peer123";

			bindings.establishOutboundBinding(selfKey, peerKey);

			expect(bindings.hasOutboundBinding(selfKey, peerKey)).toBe(true);
		});

		it("outbound binding expires after TTL", () => {
			const selfKey = "self456";
			const peerKey = "peer123";
			const now = Date.now();

			bindings.establishOutboundBinding(selfKey, peerKey, now);

			// Check immediately - should exist
			expect(bindings.hasOutboundBinding(selfKey, peerKey, now)).toBe(true);

			// Check after 21s - should be expired (TTL is 20s)
			expect(bindings.hasOutboundBinding(selfKey, peerKey, now + 21_000)).toBe(false);
		});
	});

	describe("active connection checking", () => {
		it("requires both bindIn and bindOut for active connection", () => {
			const selfKey = "self456";
			const peerKey = "peer123";

			bindings.establishInboundBinding(peerKey, selfKey);
			expect(bindings.hasActiveConnection(selfKey, peerKey)).toBe(false);

			bindings.establishOutboundBinding(selfKey, peerKey);
			expect(bindings.hasActiveConnection(selfKey, peerKey)).toBe(true);
		});
	});

	describe("relay bind tracking (amplification attack prevention)", () => {
		it("records relay bind", () => {
			const sourceKey = "source123";
			const targetKey = "target456";

			bindings.recordRelayBind(sourceKey, targetKey);

			expect(bindings.hasRecentRelayBind(sourceKey, targetKey)).toBe(true);
		});

		it("relay bind expires after TTL", () => {
			const sourceKey = "source123";
			const targetKey = "target456";
			const now = Date.now();

			bindings.recordRelayBind(sourceKey, targetKey, now);

			expect(bindings.hasRecentRelayBind(sourceKey, targetKey, now)).toBe(true);
			expect(bindings.hasRecentRelayBind(sourceKey, targetKey, now + 21_000)).toBe(false);
		});
	});

	describe("auto-establishment from adapter events", () => {
		it("establishes inbound binding on envelope event", () => {
			const remoteAddress = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const envelope = new Envelope({ payload: new Uint8Array([1, 2, 3]) });
			const external = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 9000 });

			bindings.external = external;

			const context: Adapter.Context = {
				buffer: envelope.buffer,
				remoteInfo: { address: "192.168.1.1", family: "IPv4" as const, port: 8080, size: envelope.byteLength },
				remoteAddress,
			};

			adapter.events.emit("envelope", envelope, context);

			expect(bindings.hasInboundBinding(remoteAddress.key, external.key)).toBe(true);
		});

		it("establishes outbound binding on send event", () => {
			const targetAddress = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const buffer = new Uint8Array([1, 2, 3]);
			const external = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 9000 });

			bindings.external = external;

			adapter.events.emit("send", buffer, targetAddress);

			expect(bindings.hasOutboundBinding(external.key, targetAddress.key)).toBe(true);
		});
	});

	describe("external address setter/getter", () => {
		it("sets and gets external address", () => {
			const external = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 9000 });

			bindings.external = external;

			expect(bindings.external).toBe(external);
		});
	});
});
