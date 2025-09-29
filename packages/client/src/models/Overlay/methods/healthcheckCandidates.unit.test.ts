import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { healthcheckOverlayCandidates } from "./healthcheckCandidates";

describe("healthchecks candidates", () => {
	let overlay: Overlay;
	let mockSocket: any;
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

		overlay.external = new Ipv4Address({
			ip: new Uint8Array([127, 0, 0, 1]),
			port: 3000,
		});

		pingSpy = jest.spyOn(overlay, "ping").mockResolvedValue();

		Object.defineProperty(overlay, "candidates", {
			get: () => [...overlay.candidateMap.values()],
		});

		overlay.options.candidateCount = 100;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("removes candidates that fail ping", async () => {
		const goodCandidate = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const badCandidate = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 2]),
			port: 8080,
		});

		overlay.candidateMap.set(goodCandidate.key, goodCandidate);
		overlay.candidateMap.set(badCandidate.key, badCandidate);

		pingSpy.mockImplementation((address) => {
			if (address === badCandidate) {
				return Promise.reject(new Error("Ping failed"));
			}
			return Promise.resolve();
		});

		await healthcheckOverlayCandidates(overlay);

		expect(overlay.candidateMap.has(goodCandidate.key)).toBe(true);
		expect(overlay.candidateMap.has(badCandidate.key)).toBe(false);
	});

	it("handles mixed success/failure scenarios", async () => {
		const successCandidate = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		const failCandidate1 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 2]),
			port: 8080,
		});

		const failCandidate2 = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 3]),
			port: 8080,
		});

		overlay.candidateMap.set(successCandidate.key, successCandidate);
		overlay.candidateMap.set(failCandidate1.key, failCandidate1);
		overlay.candidateMap.set(failCandidate2.key, failCandidate2);

		pingSpy.mockImplementation((address) => {
			if (address === successCandidate) {
				return Promise.resolve();
			}
			return Promise.reject(new Error("Ping failed"));
		});

		await healthcheckOverlayCandidates(overlay);

		expect(overlay.candidateMap.size).toBe(1);
		expect(overlay.candidateMap.has(successCandidate.key)).toBe(true);
	});

	it("handles empty candidate list", async () => {
		await expect(healthcheckOverlayCandidates(overlay)).resolves.not.toThrow();

		expect(pingSpy).not.toHaveBeenCalled();
		expect(overlay.candidateMap.size).toBe(0);
	});
});
