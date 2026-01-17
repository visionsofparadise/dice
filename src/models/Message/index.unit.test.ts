import { describe, expect, it } from "vitest";
import { Message } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { Ipv4Address } from "../Ipv4Address";
import { createTransactionId } from "../TransactionId/Codec";
import { MessageBodyType } from "./BodyCodec";
import { MessageVersion } from "./Codec";

describe("Message", () => {
	describe("constructor", () => {
		it("creates NOOP message", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			expect(message.body.type).toBe(MessageBodyType.NOOP);
			expect(message.flags.isNotCandidate).toBe(false);
			expect(message.magicBytes).toBe(MAGIC_BYTES);
			expect(message.version).toBe(MessageVersion.V0);
		});

		it("creates PING message", () => {
			const transactionId = createTransactionId();

			const message = new Message({
				body: {
					type: MessageBodyType.PING,
					transactionId,
				},
			});

			expect(message.body.type).toBe(MessageBodyType.PING);
			expect(message.body.transactionId).toBe(transactionId);
		});

		it("creates PONG message", () => {
			const transactionId = createTransactionId();
			const reflectionAddress = Ipv4Address.fromString("192.0.2.1:8080");

			const message = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress,
				},
			});

			expect(message.body.type).toBe(MessageBodyType.PONG);
			expect(message.body.transactionId).toBe(transactionId);
			expect(message.body.reflectionAddress).toBe(reflectionAddress);
		});

		it("creates BIND_REQUEST message", () => {
			const transactionId = createTransactionId();
			const sourceAddress = Ipv4Address.fromString("192.0.2.1:8080");

			const message = new Message({
				body: {
					type: MessageBodyType.BIND_REQUEST,
					transactionId,
					sourceAddress,
				},
			});

			expect(message.body.type).toBe(MessageBodyType.BIND_REQUEST);
			expect(message.body.transactionId).toBe(transactionId);
			expect(message.body.sourceAddress).toBe(sourceAddress);
		});

		it("creates BIND message", () => {
			const transactionId = createTransactionId();

			const message = new Message({
				body: {
					type: MessageBodyType.BIND,
					transactionId,
				},
			});

			expect(message.body.type).toBe(MessageBodyType.BIND);
			expect(message.body.transactionId).toBe(transactionId);
		});

		it("sets isNotCandidate flag", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
				flags: { isNotCandidate: true },
			});

			expect(message.flags.isNotCandidate).toBe(true);
		});

		it("defaults isNotCandidate to false", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			expect(message.flags.isNotCandidate).toBe(false);
		});
	});

	describe("buffer", () => {
		it("encodes to Uint8Array", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			const buffer = message.buffer;

			expect(buffer).toBeInstanceOf(Uint8Array);
			expect(buffer.length).toBeGreaterThan(0);
		});

		it("caches buffer", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			const buffer1 = message.buffer;
			const buffer2 = message.buffer;

			expect(buffer1).toBe(buffer2);
		});
	});

	describe("byteLength", () => {
		it("returns correct size", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			expect(message.byteLength).toBeGreaterThan(0);
		});

		it("caches byte length", () => {
			const message = new Message({
				body: {
					type: MessageBodyType.NOOP,
				},
			});

			const length1 = message.byteLength;
			const length2 = message.byteLength;

			expect(length1).toBe(length2);
		});
	});

	describe("properties", () => {
		it("returns all message properties", () => {
			const transactionId = createTransactionId();
			const reflectionAddress = Ipv4Address.fromString("192.0.2.1:8080");

			const message = new Message({
				body: {
					type: MessageBodyType.PONG,
					transactionId,
					reflectionAddress,
				},
				flags: { isNotCandidate: true },
			});

			const props = message.properties;

			expect(props.body.type).toBe(MessageBodyType.PONG);
			expect(props.body.transactionId).toBe(transactionId);
			expect(props.body.reflectionAddress).toBe(reflectionAddress);
			expect(props.flags.isNotCandidate).toBe(true);
			expect(props.magicBytes).toBe(MAGIC_BYTES);
			expect(props.version).toBe(MessageVersion.V0);
		});
	});
});
