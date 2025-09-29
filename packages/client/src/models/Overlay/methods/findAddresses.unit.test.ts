import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { findOverlayAddresses } from "./findAddresses";

describe("finds addresses", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let listSpy: jest.SpyInstance;
	let pingSpy: jest.SpyInstance;

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

		overlay.options.concurrency = 2;
		overlay.options.depth = { minimum: 2, maximum: 5 };

		listSpy = jest.spyOn(overlay, "list").mockResolvedValue([]);
		pingSpy = jest.spyOn(overlay, "ping").mockResolvedValue();

		Object.defineProperty(overlay, "coordinators", {
			get: () => [...overlay.coordinatorMap.values()],
		});

		Object.defineProperty(overlay, "candidates", {
			get: () => [...overlay.candidateMap.values()],
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("stops at minimum depth when ping time increases", async () => {
		const initialAddress = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const nextAddress1 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const nextAddress2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 2]),
			port: 8080,
		});

		overlay.coordinatorMap.set(initialAddress.key, initialAddress);
		overlay.options.depth = { minimum: 1, maximum: 3 };

		listSpy.mockImplementation((address) => {
			if (address === initialAddress) {
				return Promise.resolve([nextAddress1]);
			}
			if (address === nextAddress1) {
				return Promise.resolve([nextAddress2]);
			}
			return Promise.resolve([]);
		});

		let callCount = 0;
		pingSpy.mockImplementation(() => {
			callCount++;

			return new Promise((resolve) => setTimeout(resolve, callCount * 10));
		});

		const result = await findOverlayAddresses(overlay, 10);

		expect(result.length).toBeGreaterThan(0);
	});

	it("continues to maximum depth when ping times improve", async () => {
		const initialAddress = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const addresses = Array.from(
			{ length: 5 },
			(_, i) =>
				new Ipv4Address({
					ip: new Uint8Array([192, 168, 1, i + 1]),
					port: 8080,
				})
		);

		overlay.coordinatorMap.set(initialAddress.key, initialAddress);
		overlay.options.depth = { minimum: 2, maximum: 5 };

		listSpy.mockImplementation(() => Promise.resolve(addresses));

		let callCount = 0;
		pingSpy.mockImplementation(() => {
			callCount++;
			return new Promise((resolve) => setTimeout(resolve, Math.max(1, 50 - callCount * 10)));
		});

		await findOverlayAddresses(overlay, 10);

		expect(pingSpy).toHaveBeenCalled();
	});

	it("handles concurrent discovery from multiple initial addresses", async () => {
		const coord1 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 1]),
			port: 8080,
		});

		const coord2 = new Ipv4Address({
			ip: new Uint8Array([203, 0, 113, 2]),
			port: 8080,
		});

		overlay.coordinatorMap.set(coord1.key, coord1);
		overlay.coordinatorMap.set(coord2.key, coord2);

		const discoveredAddresses = [new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 }), new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 2]), port: 8080 })];

		listSpy.mockResolvedValue(discoveredAddresses);

		await findOverlayAddresses(overlay, 5);

		expect(listSpy).toHaveBeenCalledWith(coord1);
		expect(listSpy).toHaveBeenCalledWith(coord2);
	});
});
