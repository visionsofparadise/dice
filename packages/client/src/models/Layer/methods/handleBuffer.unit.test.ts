import { vi } from "vitest";
import { Layer } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Envelope } from "../../Envelope";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { handleOverlayBuffer } from "./handleBuffer";

describe("handles buffer", () => {
	let layer: Layer;
	let mockSocket: any;
	let emitSpy: any;
	let context: any;

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
		layer.state = Layer.STATE.OPENED;

		emitSpy = vi.spyOn(layer.events, "emit");

		context = {
			remoteInfo: {
				address: "192.168.1.1",
				family: "IPv4",
				port: 8080,
				size: 100,
			},
		};

		// Mock logger
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

	it("ignores buffer with wrong magic bytes", async () => {
		const wrongMagicBuffer = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x00, 0x01]);

		await handleOverlayBuffer(layer, wrongMagicBuffer, context);

		// Buffer event should be emitted, but not envelope event
		expect(emitSpy).toHaveBeenCalledWith("buffer", wrongMagicBuffer, context.remoteInfo);
		expect(emitSpy).not.toHaveBeenCalledWith("envelope", expect.anything(), expect.anything());
	});

	it("ignores buffer from different address family", async () => {
		const ipv6Context = {
			remoteInfo: {
				address: "::1",
				family: "IPv6" as const,
				port: 8080,
				size: 100,
			},
		};

		const validMessage = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		const envelope = new Envelope({ payload: validMessage.buffer });

		await handleOverlayBuffer(layer, envelope.buffer, ipv6Context);

		// Buffer event emitted, but envelope processing stops due to wrong address family
		expect(emitSpy).toHaveBeenCalledWith("buffer", envelope.buffer, ipv6Context.remoteInfo);
		expect(emitSpy).not.toHaveBeenCalledWith("diceMessage", expect.anything(), expect.anything());
	});

	it("processes valid message buffer", async () => {
		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		const envelope = new Envelope({ payload: message.buffer });

		await handleOverlayBuffer(layer, envelope.buffer, context);

		// Should emit buffer, envelope, and diceMessage events
		expect(emitSpy).toHaveBeenCalledWith("buffer", envelope.buffer, context.remoteInfo);
		expect(emitSpy).toHaveBeenCalledWith("envelope", expect.any(Envelope), expect.objectContaining({
			buffer: envelope.buffer,
			layer,
			remoteAddress: expect.any(Ipv4Address),
			remoteInfo: context.remoteInfo,
		}));
		expect(emitSpy).toHaveBeenCalledWith("diceMessage", expect.any(Message), expect.objectContaining({
			layer,
			remoteAddress: expect.any(Ipv4Address),
			remoteInfo: context.remoteInfo,
		}));
	});

	it("handles PING message correctly", async () => {
		const pingMessage = new Message({
			flags: { isNotCandidate: true },
			body: {
				type: MessageBodyType.PING,
				transactionId: new Uint8Array([1, 2, 3]),
			},
		});

		const envelope = new Envelope({ payload: pingMessage.buffer });

		await handleOverlayBuffer(layer, envelope.buffer, context);

		expect(emitSpy).toHaveBeenCalledWith(
			"diceMessage",
			expect.objectContaining({
				body: expect.objectContaining({
					type: MessageBodyType.PING,
					transactionId: new Uint8Array([1, 2, 3]),
				}),
			}),
			expect.any(Object)
		);
	});
});
