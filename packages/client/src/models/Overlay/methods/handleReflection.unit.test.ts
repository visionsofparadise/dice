import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { handleOverlayReflection } from "./handleReflection";

describe("handles reflection", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let emitSpy: jest.SpyInstance;

	beforeEach(() => {
		mockSocket = {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 3000 }),
			on: jest.fn(),
			removeListener: jest.fn(),
			send: jest.fn(),
			close: jest.fn(),
			unref: jest.fn(),
		};

		overlay = new Overlay({ socket: mockSocket });
		emitSpy = jest.spyOn(overlay.events, "emit");

		Object.defineProperty(overlay, "coordinators", {
			get: () => [],
		});

		Object.defineProperty(overlay, "isReachable", {
			get: () => false,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("ignores duplicate remote address prefix", () => {
		const remoteAddress = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const reflectionAddress = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		overlay.reflection.set(remoteAddress.prefix, reflectionAddress);

		handleOverlayReflection(overlay, remoteAddress, reflectionAddress);

		expect(overlay.reflection.size).toBe(1);
	});

	it("adds first reflection entry", () => {
		const remoteAddress = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const reflectionAddress = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		handleOverlayReflection(overlay, remoteAddress, reflectionAddress);

		expect(overlay.reflection.size).toBe(1);
		expect(overlay.reflection.get(remoteAddress.prefix)).toBe(reflectionAddress);
	});

	it("adds second reflection entry", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const reflectionAddress1 = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const reflectionAddress2 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 2]),
			port: 8080,
		});

		handleOverlayReflection(overlay, remoteAddress1, reflectionAddress1);
		handleOverlayReflection(overlay, remoteAddress2, reflectionAddress2);

		expect(overlay.reflection.size).toBe(2);
	});

	it("evicts oldest when adding third reflection (LRU)", () => {
		const remoteAddr1 = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 8080 });
		const reflectionAddr1 = new Ipv4Address({ ip: new Uint8Array([198, 51, 100, 1]), port: 8080 });

		const remoteAddr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
		const reflectionAddr2 = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 2]), port: 8080 });

		handleOverlayReflection(overlay, remoteAddr1, reflectionAddr1);
		handleOverlayReflection(overlay, remoteAddr2, reflectionAddr2);

		const remoteAddr3 = new Ipv4Address({ ip: new Uint8Array([10, 0, 0, 1]), port: 8080 });
		const reflectionAddr3 = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 3]), port: 8080 });

		handleOverlayReflection(overlay, remoteAddr3, reflectionAddr3);

		expect(overlay.reflection.size).toBe(2);
		expect(overlay.reflection.has(remoteAddr1.prefix)).toBe(false); // First one evicted
		expect(overlay.reflection.has(remoteAddr2.prefix)).toBe(true);
		expect(overlay.reflection.has(remoteAddr3.prefix)).toBe(true);
	});

	it("sets address to reflection when both are same (direct connectivity)", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const sameReflectionAddress = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		handleOverlayReflection(overlay, remoteAddress1, sameReflectionAddress);
		handleOverlayReflection(overlay, remoteAddress2, sameReflectionAddress);

		expect(overlay.external).toBe(sameReflectionAddress);
		expect(emitSpy).toHaveBeenCalledWith("address", sameReflectionAddress, []);
	});

	it("clears address when reflections differ (symmetric NAT)", () => {
		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const reflectionAddress1 = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const reflectionAddress2 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 2]),
			port: 8080,
		});

		handleOverlayReflection(overlay, remoteAddress1, reflectionAddress1);
		handleOverlayReflection(overlay, remoteAddress2, reflectionAddress2);

		expect(overlay.external).toBeUndefined();
		expect(emitSpy).toHaveBeenCalledWith("address", undefined, []);
	});

	it("skips when existing address matches reflection", () => {
		const existingAddress = new Ipv4Address({
			ip: new Uint8Array([198, 51, 100, 1]),
			port: 8080,
		});

		overlay.external = existingAddress;

		const remoteAddress1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const remoteAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		handleOverlayReflection(overlay, remoteAddress1, existingAddress);
		handleOverlayReflection(overlay, remoteAddress2, existingAddress);

		expect(overlay.external).toBe(existingAddress);
		expect(emitSpy).not.toHaveBeenCalled();
	});
});
