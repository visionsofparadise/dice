import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingRequests } from ".";
import { Ipv4Address } from "../Ipv4Address";
import { Message } from "../Message";
import { MessageBodyType } from "../Message/BodyCodec";
import { createTransactionId } from "../TransactionId/Codec";
import { UdpTransport } from "../UdpTransport";

describe("PendingRequests", () => {
	let mockUdpTransport: UdpTransport;
	let correlator: PendingRequests;

	beforeEach(() => {
		const mockSocket = {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 8080 }),
			close: vi.fn(),
			on: vi.fn(),
			removeListener: vi.fn(),
			send: vi.fn(),
			unref: vi.fn(),
		};

		mockUdpTransport = new UdpTransport({ socket: mockSocket });
		correlator = new PendingRequests({ udpTransport: mockUdpTransport });
	});

	describe("constructor", () => {
		it("initializes with OPENED state", () => {
			expect(correlator.state).toBe(PendingRequests.STATE.OPENED);
		});

		it("registers diceMessage listener on udpTransport", () => {
			expect(mockUdpTransport.events.listenerCount("diceMessage")).toBeGreaterThan(0);
		});

		it("uses default timeout", () => {
			expect(correlator.options.timeoutMs).toBe(3_000);
		});

		it("respects custom timeout", () => {
			const customCorrelator = new PendingRequests({
				udpTransport: mockUdpTransport,
				timeoutMs: 5_000,
			});

			expect(customCorrelator.options.timeoutMs).toBe(5_000);
		});
	});

	describe("awaitResponse", () => {
		it("resolves when matching response arrives", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions);

			// Simulate response
			const pongMessage = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			const context: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "127.0.0.2", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: source,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", pongMessage, context);

			const response = await responsePromise;

			expect(response.body.type).toBe(MessageBodyType.PONG);
			expect(response.body.transactionId).toEqual(transactionId);
		});

		it("rejects on timeout", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			await expect(correlator.awaitResponse(assertions, { timeoutMs: 100 })).rejects.toThrow("Awaiting response timed out");
		});

		it("rejects when abort signal is triggered", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();
			const abortController = new AbortController();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions, {
				signal: abortController.signal,
			});

			abortController.abort();

			await expect(responsePromise).rejects.toThrow("Awaiting response aborted");
		});

		it("rejects immediately if signal already aborted", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();
			const abortController = new AbortController();
			abortController.abort();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			await expect(correlator.awaitResponse(assertions, { signal: abortController.signal })).rejects.toThrow("Awaiting response aborted");
		});

		it("aborts send when sendAbortController provided", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();
			const sendAbortController = new AbortController();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions, {
				sendAbortController,
				timeoutMs: 100,
			});

			// Wait for timeout
			await expect(responsePromise).rejects.toThrow("Awaiting response timed out");

			expect(sendAbortController.signal.aborted).toBe(true);
		});

		it("cleans up listeners on resolve", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions);

			expect(correlator.pendingCount).toBe(1);

			const pongMessage = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			const context: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "127.0.0.2", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: source,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", pongMessage, context);

			await responsePromise;

			expect(correlator.pendingCount).toBe(0);
		});

		it("cleans up listeners on timeout", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions, { timeoutMs: 100 });

			expect(correlator.pendingCount).toBe(1);

			await expect(responsePromise).rejects.toThrow("Awaiting response timed out");

			expect(correlator.pendingCount).toBe(0);
		});

		it("only resolves matching transaction ID", async () => {
			const transactionId1 = createTransactionId();
			const transactionId2 = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId: transactionId1 },
			};

			const responsePromise = correlator.awaitResponse(assertions, { timeoutMs: 1000 });

			// Send wrong transaction ID
			const wrongMessage = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId: transactionId2,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			const context: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "127.0.0.2", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: source,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", wrongMessage, context);

			// Should still be pending
			expect(correlator.pendingCount).toBe(1);

			// Send correct transaction ID
			const correctMessage = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId: transactionId1,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			mockUdpTransport.events.emit("diceMessage", correctMessage, context);

			const response = await responsePromise;

			expect(response.body.transactionId).toEqual(transactionId1);
		});

		it("only resolves matching message type", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions, { timeoutMs: 1000 });

			// Send wrong message type
			const wrongMessage = new Message({
				body: {
					type: MessageBodyType.BIND,
					transactionId,
				},
			});

			const context: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "127.0.0.2", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: source,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", wrongMessage, context);

			// Should still be pending
			expect(correlator.pendingCount).toBe(1);

			// Send correct message type
			const correctMessage = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			mockUdpTransport.events.emit("diceMessage", correctMessage, context);

			const response = await responsePromise;

			expect(response.body.type).toBe(MessageBodyType.PONG);
		});

		it("only resolves matching source address", async () => {
			const transactionId = createTransactionId();
			const source1 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 1]), port: 8080 });
			const source2 = new Ipv4Address({ ip: Uint8Array.from([192, 0, 2, 2]), port: 8080 });

			const assertions = {
				source: { address: { key: source1.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const responsePromise = correlator.awaitResponse(assertions, { timeoutMs: 1000 });

			// Send from wrong source
			const message = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress: Ipv4Address.mock(),
				},
			});

			const wrongContext: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.2", family: "IPv4", port: 8080, size: 100 },
				remoteAddress: source2,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", message, wrongContext);

			// Should still be pending
			expect(correlator.pendingCount).toBe(1);

			// Send from correct source
			const correctContext: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "192.0.2.1", family: "IPv4", port: 8080, size: 100 },
				remoteAddress: source1,
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			mockUdpTransport.events.emit("diceMessage", message, correctContext);

			const response = await responsePromise;

			expect(response.body.transactionId).toEqual(transactionId);
		});
	});

	describe("abortAll", () => {
		it("aborts all pending requests", async () => {
			const transactionId1 = createTransactionId();
			const transactionId2 = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions1 = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId: transactionId1 },
			};

			const assertions2 = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.BIND, transactionId: transactionId2 },
			};

			const promise1 = correlator.awaitResponse(assertions1);
			const promise2 = correlator.awaitResponse(assertions2);

			expect(correlator.pendingCount).toBe(2);

			correlator.abortAll();

			expect(correlator.pendingCount).toBe(0);

			await expect(promise1).rejects.toThrow("Awaiting response aborted");
			await expect(promise2).rejects.toThrow("Awaiting response aborted");
		});

		it("clears all listeners", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const promise = correlator.awaitResponse(assertions).catch(() => {}); // Catch to prevent unhandled rejection

			expect(correlator.listeners.size).toBe(1);

			correlator.abortAll();

			expect(correlator.listeners.size).toBe(0);

			await promise; // Wait for promise to resolve
		});
	});

	describe("abortRequest", () => {
		it("aborts specific request by key", async () => {
			const transactionId = createTransactionId();
			const source = Ipv4Address.mock();

			const assertions = {
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId },
			};

			const promise = correlator.awaitResponse(assertions);

			expect(correlator.pendingCount).toBe(1);

			const { hex } = await import("@scure/base");
			const key = `${source.key}:${MessageBodyType.PONG}:${hex.encode(transactionId)}`;

			correlator.abortRequest(key);

			expect(correlator.pendingCount).toBe(0);

			await expect(promise).rejects.toThrow("Awaiting response aborted");
		});

		it("does nothing for non-existent key", () => {
			correlator.abortRequest("non-existent-key");

			expect(correlator.pendingCount).toBe(0);
		});
	});

	describe("close", () => {
		it("removes udpTransport listener", () => {
			const initialListenerCount = mockUdpTransport.events.listenerCount("diceMessage");

			correlator.close();

			expect(mockUdpTransport.events.listenerCount("diceMessage")).toBe(initialListenerCount - 1);
		});

		it("sets state to CLOSED", () => {
			correlator.close();

			expect(correlator.state).toBe(PendingRequests.STATE.CLOSED);
		});

		it("is idempotent", () => {
			const initialListenerCount = mockUdpTransport.events.listenerCount("diceMessage");

			correlator.close();
			correlator.close();

			expect(mockUdpTransport.events.listenerCount("diceMessage")).toBe(initialListenerCount - 1);
		});
	});

	describe("pendingCount", () => {
		it("returns correct number of pending requests", () => {
			expect(correlator.pendingCount).toBe(0);

			const transactionId1 = createTransactionId();
			const transactionId2 = createTransactionId();
			const source = Ipv4Address.mock();

			correlator.awaitResponse({
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.PONG, transactionId: transactionId1 },
			});

			expect(correlator.pendingCount).toBe(1);

			correlator.awaitResponse({
				source: { address: { key: source.key } },
				body: { type: MessageBodyType.BIND, transactionId: transactionId2 },
			});

			expect(correlator.pendingCount).toBe(2);
		});
	});

	describe("message handling", () => {
		it("ignores messages without transactionId", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			const context: UdpTransport.PayloadContext = {
				buffer: new Uint8Array([1, 2, 3]),
				remoteInfo: { address: "127.0.0.2", family: "IPv4", port: 9090, size: 100 },
				remoteAddress: Ipv4Address.mock(),
				envelope: { payload: new Uint8Array([1, 2, 3]) } as any,
			};

			// Should not throw
			expect(() => {
				mockUdpTransport.events.emit("diceMessage", message, context);
			}).not.toThrow();
		});
	});
});
