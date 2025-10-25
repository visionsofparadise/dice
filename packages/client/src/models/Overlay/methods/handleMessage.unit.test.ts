import { vi } from "vitest";
import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { handleOverlayMessage } from "./handleMessage";

describe("handles message", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let context: Overlay.Context;
	let remoteAddress: Ipv4Address;
	let handlePingSpy: any;
	let handleAddressSpy: any;

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

		remoteAddress = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		context = {
			buffer: new Uint8Array([1, 2, 3]),
			overlay,
			remoteInfo: {
				address: "192.168.1.1",
				family: "IPv4",
				port: 8080,
				size: 3,
			},
			remoteAddress,
		};

		handlePingSpy = vi.spyOn(overlay, "handlePing").mockResolvedValue(undefined);
		handleAddressSpy = vi.spyOn(overlay, "handleAddress").mockReturnValue(undefined);

		overlay.logger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			log: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("handles PING message", async () => {
		const message = new Message({
			flags: { isNotCandidate: false },
			body: {
				type: MessageBodyType.PING,
				transactionId: new Uint8Array([1, 2, 3]),
			},
		});

		await handleOverlayMessage(overlay, message, context);

		expect(handlePingSpy).toHaveBeenCalledWith(message, context);
		expect(handleAddressSpy).toHaveBeenCalledWith(remoteAddress, message);
	});

	it("handles response messages via response listener map", async () => {
		const transactionId = new Uint8Array([13, 14, 15]);
		const mockListener = vi.fn();

		const key = remoteAddress.key + MessageBodyType.PONG + "0d0e0f";
		overlay.responseListenerMap.set(key, {
			abort: new AbortController(),
			listener: mockListener,
		});

		const message = new Message({
			flags: { isNotCandidate: false },
			body: {
				type: MessageBodyType.PONG,
				transactionId,
				reflectionAddress: remoteAddress,
			},
		});

		await handleOverlayMessage(overlay, message, context);

		expect(mockListener).toHaveBeenCalledWith(message, context);
		expect(handleAddressSpy).toHaveBeenCalledWith(remoteAddress, message);
	});
});
