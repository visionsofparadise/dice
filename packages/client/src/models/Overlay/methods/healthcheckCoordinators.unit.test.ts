import { vi } from "vitest";
import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { healthcheckOverlayCoordinators } from "./healthcheckCoordinators";

describe("healthchecks coordinators", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let pingSpy: any;
	let findAddressesSpy: any;

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

		overlay.external = new Ipv4Address({
			ip: new Uint8Array([127, 0, 0, 1]),
			port: 3000,
		});

		pingSpy = vi.spyOn(overlay, "ping").mockResolvedValue();
		findAddressesSpy = vi.spyOn(overlay, "findAddresses").mockResolvedValue([]);

		Object.defineProperty(overlay, "isReachable", {
			get: () => false,
		});

		Object.defineProperty(overlay, "coordinators", {
			get: () => [...overlay.coordinatorMap.values()],
		});

		overlay.options.coordinatorCount = 3;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("removes coordinators that fail ping", async () => {
		const goodCoord = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const badCoord = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 2]),
			port: 8080,
		});

		overlay.coordinatorMap.set(goodCoord.key, goodCoord);
		overlay.coordinatorMap.set(badCoord.key, badCoord);

		pingSpy.mockImplementation((address: any) => {
			if (address === badCoord) {
				return Promise.reject(new Error("Ping failed"));
			}
			return Promise.resolve();
		});

		await healthcheckOverlayCoordinators(overlay);

		expect(overlay.coordinatorMap.has(goodCoord.key)).toBe(true);
		expect(overlay.coordinatorMap.has(badCoord.key)).toBe(false);
	});

	it("finds new coordinators when below target count", async () => {
		const existingCoord = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const newCoord1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 2]),
			port: 8080,
		});

		const newCoord2 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 3]),
			port: 8080,
		});

		overlay.coordinatorMap.set(existingCoord.key, existingCoord);
		overlay.options.coordinatorCount = 3;

		findAddressesSpy.mockResolvedValue([newCoord1, newCoord2]);

		await healthcheckOverlayCoordinators(overlay);

		expect(findAddressesSpy).toHaveBeenCalledWith(2);
		expect(overlay.coordinatorMap.has(existingCoord.key)).toBe(true);
		expect(overlay.coordinatorMap.has(newCoord1.key)).toBe(true);
		expect(overlay.coordinatorMap.has(newCoord2.key)).toBe(true);
	});

	it("handles no existing coordinators", async () => {
		const newCoord = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		overlay.options.coordinatorCount = 1;
		findAddressesSpy.mockResolvedValue([newCoord]);

		await healthcheckOverlayCoordinators(overlay);

		expect(findAddressesSpy).toHaveBeenCalledWith(1);
		expect(overlay.coordinatorMap.has(newCoord.key)).toBe(true);
	});
});
