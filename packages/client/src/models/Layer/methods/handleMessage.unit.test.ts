import { vi } from "vitest";
import { Layer } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { handleOverlayMessage } from "./handleMessage";

describe("handles message", () => {
	let layer: Layer;
	let mockSocket: any;
	let context: Layer.Context;
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

		layer = new Layer({ socket: mockSocket });

		remoteAddress = new Ipv4Address({
			ip: new Uint8Array([192, 168, 1, 1]),
			port: 8080,
		});

		context = {
			buffer: new Uint8Array([1, 2, 3]),
			layer,
			remoteInfo: {
				address: "192.168.1.1",
				family: "IPv4",
				port: 8080,
				size: 3,
			},
			remoteAddress,
		};

		handlePingSpy = vi.spyOn(layer, "handlePing").mockResolvedValue(undefined);
		handleAddressSpy = vi.spyOn(layer, "handleAddress").mockReturnValue(undefined);

		layer.logger = {
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

		await handleOverlayMessage(layer, message, context);

		expect(handlePingSpy).toHaveBeenCalledWith(message, context);
		expect(handleAddressSpy).toHaveBeenCalledWith(remoteAddress);
	});

	it("handles response messages via response listener map", async () => {
		const transactionId = new Uint8Array([13, 14, 15]);
		const mockListener = vi.fn();

		const key = remoteAddress.key + MessageBodyType.PONG + "0d0e0f";
		layer.correlator.listeners.set(key, {
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

		await handleOverlayMessage(layer, message, context);

		expect(mockListener).toHaveBeenCalledWith(message);
		expect(handleAddressSpy).toHaveBeenCalledWith(remoteAddress);
	});
});
