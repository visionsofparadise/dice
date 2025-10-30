import { vi } from "vitest";
import { Adapter } from "../../Adapter";
import { Layer } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";

describe("handles message", () => {
	let layer: Layer;
	let mockSocket: any;
	let context: Adapter.Context;
	let remoteAddress: Ipv4Address;
	let handlePingSpy: any;

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
			remoteInfo: {
				address: "192.168.1.1",
				family: "IPv4",
				port: 8080,
				size: 3,
			},
			remoteAddress,
		};

		handlePingSpy = vi.spyOn(layer, "handlePing").mockResolvedValue(undefined);

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

		await layer.handleMessage(message, context);

		expect(handlePingSpy).toHaveBeenCalledWith(message, context);
		// Note: handleAddress is called from envelope event listener, not handleMessage
	});

	it("handles NOOP message (no-op)", async () => {
		const message = new Message({
			body: {
				type: MessageBodyType.NOOP,
			},
		});

		// NOOP should not call any handlers (it's a no-op)
		const handleBindRequestSpy = vi.spyOn(layer, "handleBindRequest" as any);

		await layer.handleMessage(message, context);

		expect(handlePingSpy).not.toHaveBeenCalled();
		expect(handleBindRequestSpy).not.toHaveBeenCalled();
	});

	it("handles RELAY_BIND_REQUEST message", async () => {
		const targetAddress = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 9000 });
		const message = new Message({
			body: {
				type: MessageBodyType.RELAY_BIND_REQUEST,
				transactionId: new Uint8Array([1, 2, 3]),
				targetAddress,
			},
		});

		const handleRelayBindRequestSpy = vi.spyOn(layer, "handleRelayBindRequest" as any).mockResolvedValue(undefined);

		await layer.handleMessage(message, context);

		expect(handleRelayBindRequestSpy).toHaveBeenCalledWith(message, context);
	});

	it("handles BIND_REQUEST message", async () => {
		const sourceAddress = new Ipv4Address({ ip: new Uint8Array([203, 0, 113, 1]), port: 9000 });
		const message = new Message({
			body: {
				type: MessageBodyType.BIND_REQUEST,
				transactionId: new Uint8Array([1, 2, 3]),
				sourceAddress,
			},
		});

		const handleBindRequestSpy = vi.spyOn(layer, "handleBindRequest" as any).mockResolvedValue(undefined);

		await layer.handleMessage(message, context);

		expect(handleBindRequestSpy).toHaveBeenCalledWith(message);
	});

	it("handles PONG message (via correlator, not handled directly)", async () => {
		const message = new Message({
			body: {
				type: MessageBodyType.PONG,
				transactionId: new Uint8Array([1, 2, 3]),
				reflectionAddress: remoteAddress,
			},
		});

		// PONG is handled by ResponseCorrelator, not Layer directly
		// Just verify it doesn't error
		await layer.handleMessage(message, context);

		expect(handlePingSpy).not.toHaveBeenCalled();
	});

	it("handles BIND message (via correlator, not handled directly)", async () => {
		const message = new Message({
			body: {
				type: MessageBodyType.BIND,
				transactionId: new Uint8Array([1, 2, 3]),
			},
		});

		// BIND is handled by ResponseCorrelator, not Layer directly
		// Just verify it doesn't error
		await layer.handleMessage(message, context);

		expect(handlePingSpy).not.toHaveBeenCalled();
	});
});
