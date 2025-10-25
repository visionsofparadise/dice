import { vi } from "vitest";
import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { isValidOverlayAddress } from "./isValidAddress";

describe("is address valid", () => {
	let overlay: Overlay;
	let mockSocket: any;

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

		overlay.local = new Ipv4Address({
			ip: new Uint8Array([127, 0, 0, 1]),
			port: 3000,
		});

		overlay.coordinatorMap.set(
			"coord1",
			new Ipv4Address({
				ip: new Uint8Array([203, 0, 113, 1]),
				port: 8080,
			})
		);

		overlay.options.bootstrapAddresses = [
			new Ipv4Address({
				ip: new Uint8Array([198, 51, 100, 1]),
				port: 8080,
			}),
		];
	});

	it("rejects bootstrap address", () => {
		expect(isValidOverlayAddress(overlay, overlay.options.bootstrapAddresses[0]!)).toBe(false);
	});
});
