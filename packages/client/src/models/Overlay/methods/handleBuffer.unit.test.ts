import { Overlay } from "..";
import { Ipv4Address } from "../../Ipv4Address";
import { Message } from "../../Message";
import { MessageBodyType } from "../../Message/BodyCodec";
import { VERSION } from "../../Message/Codec";
import { handleOverlayBuffer } from "./handleBuffer";

describe("handles buffer", () => {
	let overlay: Overlay;
	let mockSocket: any;
	let emitSpy: jest.SpyInstance;
	let context: any;

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
		overlay.state = Overlay.STATE.OPENED;

		emitSpy = jest.spyOn(overlay.events, "emit");

		context = {
			remoteInfo: {
				address: "192.168.1.1",
				family: "IPv4",
				port: 8080,
				size: 100,
			},
		};

		// Mock logger
		overlay.logger = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			log: jest.fn(),
			trace: jest.fn(),
			warn: jest.fn(),
		};
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("ignores buffer with wrong magic bytes", async () => {
		const wrongMagicBuffer = new Uint8Array([0xff, 0xff, 0xff, 0xff, VERSION.V0, 0x01]);

		await handleOverlayBuffer(overlay, wrongMagicBuffer, context);

		expect(emitSpy).not.toHaveBeenCalled();
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

		await handleOverlayBuffer(overlay, validMessage.buffer, ipv6Context);

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("processes valid message buffer", async () => {
		const message = new Message({
			flags: { isNotCandidate: false },
			body: { type: MessageBodyType.NOOP },
		});

		await handleOverlayBuffer(overlay, message.buffer, context);

		expect(emitSpy).toHaveBeenCalledWith(
			"message",
			expect.any(Message),
			expect.objectContaining({
				buffer: message.buffer,
				overlay,
				remoteAddress: expect.any(Ipv4Address),
				remoteInfo: context.remoteInfo,
			})
		);
	});

	it("handles PING message correctly", async () => {
		const pingMessage = new Message({
			flags: { isNotCandidate: true },
			body: {
				type: MessageBodyType.PING,
				transactionId: new Uint8Array([1, 2, 3]),
			},
		});

		await handleOverlayBuffer(overlay, pingMessage.buffer, context);

		expect(emitSpy).toHaveBeenCalledWith(
			"message",
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
