import { vi } from "vitest";
import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { handleOverlayAddress } from "./handleAddress";

describe("handles address", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let emitSpy: any;

	beforeEach(() => {
		mockSocket = {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 3000 }),
			on: vi.fn(),
			removeListener: vi.fn(),
			send: vi.fn(),
			close: vi.fn(),
			unref: vi.fn(),
		};

		overlay = new Overlay({ socket: mockSocket });
		emitSpy = vi.spyOn(overlay.events, "emit");

		overlay.external = new Ipv4Address({
			ip: new Uint8Array([127, 0, 0, 1]),
			port: 3000,
		});

		Object.defineProperty(overlay, "coordinators", {
			get: () => [],
		});

		Object.defineProperty(overlay, "isReachable", {
			get: () => true,
		});

		overlay.lastUnsolicitedAt = Date.now() - 120000;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("updates lastUnsolicitedAt and emits address when no outbound bind cache", () => {
		const address = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		const beforeTime = Date.now();
		handleOverlayAddress(overlay, address, message);
		const afterTime = Date.now();

		expect(overlay.lastUnsolicitedAt).toBeGreaterThanOrEqual(beforeTime);
		expect(overlay.lastUnsolicitedAt).toBeLessThanOrEqual(afterTime);
		expect(emitSpy).toHaveBeenCalledWith("address", overlay.external, undefined);
	});

	it("does not emit address when change is not significant (< 60s)", () => {
		const address = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		overlay.lastUnsolicitedAt = Date.now() - 30000;

		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		handleOverlayAddress(overlay, address, message);

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("removes candidate when marked as not candidate", () => {
		const address = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		overlay.candidateMap.set(address.key, address);

		const message = new Message({
			flags: { isNotCandidate: true },
			body: { type: MessageBodyType.NOOP },
		});

		handleOverlayAddress(overlay, address, message);

		expect(overlay.candidateMap.has(address.key)).toBe(false);
	});

	it("adds valid address to candidates when not full", () => {
		const address = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		overlay.options.candidateCount = 100;

		handleOverlayAddress(overlay, address, message);

		expect(overlay.candidateMap.has(address.key)).toBe(true);
		expect(overlay.candidateMap.get(address.key)).toBe(address);
	});

	it("uses LRU eviction when candidates map is full", () => {
		const oldAddress = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const newAddress = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 2]),
			port: 8080,
		});

		overlay.options.candidateCount = 1;
		overlay.candidateMap.set(oldAddress.key, oldAddress);

		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		handleOverlayAddress(overlay, newAddress, message);

		expect(overlay.candidateMap.has(oldAddress.key)).toBe(false);
		expect(overlay.candidateMap.has(newAddress.key)).toBe(true);
		expect(overlay.candidateMap.size).toBe(1);
	});

	it("does not add address that is already a coordinator", () => {
		const address = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		overlay.coordinatorMap.set(address.key, address);

		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		handleOverlayAddress(overlay, address, message);

		expect(overlay.candidateMap.has(address.key)).toBe(false);
	});
});
