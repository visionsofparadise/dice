import { vi } from "vitest";
import { Layer } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { handleOverlayReflection } from "./handleReflection";

describe("handles reflection", () => {
	let layer: Layer;
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

		layer = new Layer({ socket: mockSocket });
		emitSpy = vi.spyOn(layer.events, "emit");

		vi.spyOn(layer.coordinators, "getAll").mockReturnValue([]);

		Object.defineProperty(layer, "isReachable", {
			get: () => false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("ignores duplicate remote address prefix", () => {
		const remoteAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const reflectionAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		layer.reflection.set(remoteAddress.prefix, reflectionAddress);

		handleOverlayReflection(layer, remoteAddress, reflectionAddress);

		expect(layer.reflection.size).toBe(1);
	});

	it("adds first reflection entry", () => {
		const remoteAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const reflectionAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		handleOverlayReflection(layer, remoteAddress, reflectionAddress);

		expect(layer.reflection.size).toBe(1);
		expect(layer.reflection.get(remoteAddress.prefix)).toBe(reflectionAddress);
	});

	it("adds second reflection entry", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const reflectionAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const reflectionAddress2 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 2]),
			port: 8080,
		});

		handleOverlayReflection(layer, remoteAddress1, reflectionAddress1);
		handleOverlayReflection(layer, remoteAddress2, reflectionAddress2);

		expect(layer.reflection.size).toBe(2);
	});

	it("evicts oldest when adding third reflection (LRU)", () => {
		const remoteAddr1 = new Ipv4Address({ ip: new Uint8Array([8, 8, 4, 1]), port: 8080 });
		const reflectionAddr1 = new Ipv4Address({ ip: new Uint8Array([8, 8, 8, 1]), port: 8080 });

		const remoteAddr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
		const reflectionAddr2 = new Ipv4Address({ ip: new Uint8Array([8, 8, 4, 2]), port: 8080 });

		handleOverlayReflection(layer, remoteAddr1, reflectionAddr1);
		handleOverlayReflection(layer, remoteAddr2, reflectionAddr2);

		const remoteAddr3 = new Ipv4Address({ ip: new Uint8Array([10, 0, 0, 1]), port: 8080 });
		const reflectionAddr3 = new Ipv4Address({ ip: new Uint8Array([8, 8, 4, 3]), port: 8080 });

		handleOverlayReflection(layer, remoteAddr3, reflectionAddr3);

		expect(layer.reflection.size).toBe(2);
		expect(layer.reflection.has(remoteAddr1.prefix)).toBe(false); // First one evicted
		expect(layer.reflection.has(remoteAddr2.prefix)).toBe(true);
		expect(layer.reflection.has(remoteAddr3.prefix)).toBe(true);
	});

	it("sets address to reflection when both are same (direct connectivity)", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const sameReflectionAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		handleOverlayReflection(layer, remoteAddress1, sameReflectionAddress);
		handleOverlayReflection(layer, remoteAddress2, sameReflectionAddress);

		expect(layer.external).toBe(sameReflectionAddress);
		expect(emitSpy).toHaveBeenCalledWith("address", sameReflectionAddress, []);
	});

	it("clears address when reflections differ (symmetric NAT)", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const reflectionAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const reflectionAddress2 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 2]),
			port: 8080,
		});

		handleOverlayReflection(layer, remoteAddress1, reflectionAddress1);
		handleOverlayReflection(layer, remoteAddress2, reflectionAddress2);

		expect(layer.external).toBeUndefined();
		expect(emitSpy).toHaveBeenCalledWith("address", undefined, []);
	});

	it("skips when existing address matches reflection", () => {
		const existingAddress = new Ipv4Address({
			ip: new Uint8Array([8, 8, 8, 1]),
			port: 8080,
		});

		layer.external = existingAddress;

		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([8, 8, 4, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		handleOverlayReflection(layer, remoteAddress1, existingAddress);
		handleOverlayReflection(layer, remoteAddress2, existingAddress);

		expect(layer.external).toBe(existingAddress);
		expect(emitSpy).not.toHaveBeenCalled();
	});
});
